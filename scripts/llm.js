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
        // Only keep lastProgress while actively loading (<100%) to avoid replay after ready
        const p = (obj && typeof obj.progress === 'number') ? obj.progress : 0;
        this.lastProgress = (p < 1) ? obj : null;
        for(const fn of this._progressListeners){ try{ fn(obj); }catch(e){} }
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
        const sys = 'You are an African cooking assistant. Given a pantry and an optional country, propose ONE recipe that best fits the pantry and is culturally authentic to the specified country. Output only JSON with fields: name (string), country (string), baseServings (number), ingredients (array of {item (string), qty (number|string), unit (string)}), steps (array of strings). Keep ingredient items in simple common names. No extra text.';
        const user = `Country: ${country || 'any'}\nPantry: ${(pantry||[]).join(', ') || '(none)'}\nReturn JSON only, no markdown.`;
        const messages = [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ];
        const resp = await this.engine.chat.completions.create({
          messages,
          temperature: 0.3,
          max_tokens: 256
        });
        const raw = (resp && resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content) ? resp.choices[0].message.content : '';
        const text = String(raw || '');
        function extractJSON(s){
          try{ return JSON.parse(s); }catch(_){ }
          const m = s.match(/\{[\s\S]*\}/);
          if(m){ try{ return JSON.parse(m[0]); }catch(_){ }
          }
          return null;
        }
        function slugify(s){
          return String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,48);
        }
        const j = extractJSON(text);
        if(!j || !j.name || !Array.isArray(j.ingredients) || !Array.isArray(j.steps)) return null;
        const recipe = {
          id: 'llm-' + (slugify(j.name) || 'recipe'),
          name: String(j.name).trim(),
          country: String(j.country || country || '').trim() || (country || 'Nigeria'),
          baseServings: Number(j.baseServings) > 0 ? Number(j.baseServings) : 4,
          ingredients: (j.ingredients || []).map(it => {
            if(!it) return { item:'', qty:'', unit:'' };
            const item = (typeof it === 'string') ? it : it.item;
            let qty = (typeof it === 'string') ? '' : (typeof it.qty === 'number' ? it.qty : (it.qty || ''));
            let unit = (typeof it === 'string') ? '' : (it.unit || '');
            return { item: String(item || '').trim(), qty, unit: String(unit || '').trim() };
          }).filter(i => i.item),
          steps: (j.steps || []).map(s => String(s).trim()).filter(Boolean)
        };
        if(recipe.ingredients.length === 0 || recipe.steps.length === 0) return null;
        return recipe;
      }catch(e){
        console.warn('WebLLM generate error', e);
        return null;
      }
    }
  };

  window.App.LLM = LLM;
})();
