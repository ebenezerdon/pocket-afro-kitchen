(function(){
  window.App = window.App || {};

  const LLM = {
    engine: null,
    ready: false,
    loading: false,
    runtimeLoading: false,
    warnedOnce: false,
    module: null,
    createEngineFn: null,
    // Keep a compact model (<~500MB) compatible with WebLLM
    model: "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC",
    _progressListeners: new Set(),
    lastProgress: null,
    onProgress(fn){
      try{
        if(typeof fn === 'function'){
          this._progressListeners.add(fn);
          if(this.lastProgress){ try{ fn(this.lastProgress); }catch(e){} }
        }
      }catch(_){ }
    },
    _emitProgress(obj){
      try{
        // Only keep lastProgress if actively downloading (<100%) to avoid replay after ready or cache-only loads
        const p = (obj && typeof obj.progress === 'number') ? obj.progress : 0;
        const t = (obj && (obj.text || obj.stage)) ? (obj.text || obj.stage) : '';
        const downloading = /download|fetch|network|transfer/i.test(t) && !/cache/i.test(t);
        const out = Object.assign({}, obj, { downloading });
        this.lastProgress = (p < 1 && downloading) ? out : null;
        for(const fn of this._progressListeners){ try{ fn(out); }catch(e){} }
      }catch(_){ }
    },

    async loadRuntime(){
      if(this.createEngineFn) return true;
      if(this.runtimeLoading){
        while(this.runtimeLoading){ await new Promise(r => setTimeout(r, 120)); }
        return !!this.createEngineFn;
      }
      this.runtimeLoading = true;

      // 1) Prefer ESM dynamic import as per user's example
      const esmUrls = [
        'https://esm.run/@mlc-ai/web-llm@0.2.79',
        'https://esm.sh/@mlc-ai/web-llm@0.2.79'
      ];
      for(const u of esmUrls){
        try{
          const mod = await import(u);
          if(mod && typeof mod.CreateMLCEngine === 'function'){
            this.module = mod;
            this.createEngineFn = mod.CreateMLCEngine;
            this.runtimeLoading = false;
            return true;
          }
        }catch(_){ /* try next */ }
      }

      // 2) Fallback to global UMD loader (0.2.79, then 0.2.74)
      const umdUrls = [
        'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/dist/webllm.min.js',
        'https://unpkg.com/@mlc-ai/web-llm@0.2.79/dist/webllm.min.js',
        'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.74/dist/webllm.min.js',
        'https://unpkg.com/@mlc-ai/web-llm@0.2.74/dist/webllm.min.js'
      ];
      const tryLoad = (src) => new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
      });
      for(const u of umdUrls){
        try{
          const ok = await tryLoad(u);
          if(!ok) continue;
          await new Promise(r => setTimeout(r, 50));
          if(window.webllm && typeof window.webllm.CreateMLCEngine === 'function'){
            this.createEngineFn = window.webllm.CreateMLCEngine;
      try{ this._emitProgress({ progress: 0, text: 'Initializing AI runtime…' }); }catch(e){}
            this.runtimeLoading = false;
            return true;
          }
        }catch(_){ /* keep trying */ }
      }
        const progress = (r) => { const p = (r && typeof r.progress === 'number') ? r.progress : 0; const t = (r && (r.text || r.stage)) ? (r.text || r.stage) : 'Loading AI model…'; try{ console.log('[WebLLM]', t, Math.round(p*100)+'%'); }catch(e){} try{ this._emitProgress({ progress: p, text: t }); }catch(e){} };
      this.runtimeLoading = false;
      return false;
    },

    async ensure(){
      if(this.ready) return true;
      if(this.loading){
        while(this.loading){ await new Promise(r => setTimeout(r, 160)); }
        return this.ready;
      }
      this.loading = true;
      try{
        const ok = await this.loadRuntime();
        if(!ok || !this.createEngineFn){
          if(!this.warnedOnce){ console.warn('WebLLM runtime failed to load'); this.warnedOnce = true; }
          return false;
        }
        const progress = (r) => { try{ const p = (r && typeof r.progress === 'number') ? r.progress : 0; const t = (r && (r.text || r.stage)) ? (r.text || r.stage) : 'Loading AI model…'; console.log('[WebLLM]', t, Math.round(p*100)+'%'); this._emitProgress({ progress: p, text: t }); }catch(e){} };
        this.lastProgress = null;
        this.engine = await this.createEngineFn(this.model, { initProgressCallback: progress });
        this.ready = true;

        try{ this._emitProgress({ progress: 1, text: 'AI model ready' }); }catch(e){}
        return true;
      }catch(e){
        console.warn('WebLLM init failed', e);
        this.ready = false;
        return false;
      }finally{
        this.loading = false;
      }
    },

    isReady(){ return !!this.ready; },

    async recommend(pantry, country){
      const ok = await this.ensure();
      if(!ok || !this.engine) return null;
      try{
        const pool = (window.App && window.App.Data && Array.isArray(window.App.Data.recipes)) ? window.App.Data.recipes : [];
        const recs = pool.filter(r => !country || r.country === country);
        if(recs.length === 0) return null;

        const options = recs.map(r => {
          const ings = (r.ingredients || []).map(i => i.item).join(', ');
          return `${r.id} | ${r.name} | ingredients: ${ings}`;
        }).join('\n');

        const sys = 'You are an African cooking assistant. Choose the single best recipe id from the given options that fits the pantry. Prefer the specified country. Only output a compact JSON object like {"id":"<recipe-id>"} with an id that exactly matches one from the options. Do not add any explanation.';
        const user = `Country: ${country}\nPantry: ${(pantry||[]).join(', ') || '(none)'}\nOptions (id | name | ingredients):\n${options}\nReturn JSON only.`;
        const messages = [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ];

        const resp = await this.engine.chat.completions.create({
          messages,
          temperature: 0.1,
          max_tokens: 64
        });
        const text = (resp && resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content) ? resp.choices[0].message.content : '';

        let id = null;
        try{ const j = JSON.parse(text); if(j && typeof j.id === 'string') id = j.id.trim(); }catch(_){
          const m = String(text).match(/"id"\s*:\s*"([^"]+)"/); if(m) id = m[1];
        }
        if(!id){
          const tokens = String(text).replace(/[{}"\[\]]/g,' ').split(/\s+/).filter(Boolean);
          const ids = new Set(recs.map(r=>r.id));
          const found = tokens.find(t => ids.has(t));
          if(found) id = found;
        }
        if(!id) return null;
        return pool.find(r => r.id === id) || null;
      }catch(e){
        console.warn('WebLLM recommend error', e);
        return null;
      }
    }
  };

  window.App.LLM = LLM;
})();
