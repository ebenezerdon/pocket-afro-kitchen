(function(){
  // UI and state manager
  window.App = window.App || {};

  const KEYS = {
    pantry:'afro.pantry',
    shopping:'afro.shopping',
    lastRecipe:'afro.lastRecipe',
    servings:'afro.servings',
    country:'afro.country'
  };

  const $els = {};

  const State = {
    pantry: [],
    shopping: [],
    currentRecipe: null,
    servings: 4,
    country: 'Nigeria'
  };

  function cacheDom(){
    $els.pantryForm = $('#pantry-form');
    $els.pantryInput = $('#pantry-input');
    $els.pantryList = $('#pantry-list');
    $els.country = $('#country-select');
    $els.servings = $('#servings');
    $els.suggest = $('#btn-suggest');
    $els.naija = $('#btn-naija');
    $els.clearPantry = $('#btn-clear-pantry');
    $els.recipeCard = $('#recipe-card');
    $els.matchScore = $('#match-score');
    $els.countryBadge = $('#country-badge');
    $els.shopList = $('#shopping-list');
    $els.btnCopy = $('#btn-copy-list');
    $els.btnClearList = $('#btn-clear-list');
    $els.suggestions = $('#ingredient-suggestions');
    $els.llmBanner = $('#llm-loading');
    $els.llmText = $('#llm-loading-text');
    $els.llmBar = $('#llm-loading-bar');
    $els.llmPct = $('#llm-loading-pct');
  }

  function load(){
    State.pantry = window.App.Storage.get(KEYS.pantry, []);
    State.shopping = window.App.Storage.get(KEYS.shopping, []);
    State.servings = window.App.Storage.get(KEYS.servings, 4);
    State.country = window.App.Storage.get(KEYS.country, 'Nigeria');

    const lastId = window.App.Storage.get(KEYS.lastRecipe, null);
    if(lastId){
      const found = window.App.Data.recipes.find(r => r.id === lastId);
      if(found) State.currentRecipe = found;
    }
  }

  function save(){
    window.App.Storage.set(KEYS.pantry, State.pantry);
    window.App.Storage.set(KEYS.shopping, State.shopping);
    window.App.Storage.set(KEYS.servings, State.servings);
    window.App.Storage.set(KEYS.country, State.country);
    window.App.Storage.set(KEYS.lastRecipe, State.currentRecipe ? State.currentRecipe.id : null);
  }

  function renderCountries(){
    const options = window.App.Utils.countries.map(c => `<option value="${c}">${c}</option>`).join('');
    $els.country.html(options);
    $els.country.val(State.country);
    $els.countryBadge.text(State.country);
  }

  function renderPantry(){
    const chips = State.pantry.map((p, idx) => {
      return `<span class="chip" data-index="${idx}">${p}<button class="chip-remove" aria-label="Remove ${p}" data-action="remove-pantry" data-index="${idx}">✕</button></span>`;
    }).join('');
    $els.pantryList.html(chips || '<p class="text-sm text-[#64748B]">No items yet. Try adding rice, tomato, onion.</p>');
  }

  function allIngredients(){
    const pool = [];
    for(const r of window.App.Data.recipes){
      for(const ing of r.ingredients){ pool.push(window.App.Utils.normalizeItem(ing.item)); }
    }
    return window.App.Utils.uniq(pool).sort();
  }

  function renderIngredientSuggestions(){
    const list = allIngredients();
    const opts = list.map(i => `<option value="${i}"></option>`).join('');
    $els.suggestions.html(opts);
  }

  function renderRecipe(){
    const r = State.currentRecipe;
    if(!r){
      $els.recipeCard.html('<div class="text-[#64748B]">No recipe yet. Click Suggest recipe to get started.</div>');
      $els.matchScore.text('Match: 0 percent');
      return;
    }
    const base = r.baseServings || 4;
    const factor = Math.max(1, Number(State.servings) || base) / base;
    const scaled = window.App.Utils.scaleIngredients(r.ingredients, factor);
    const score = window.App.Utils.scoreRecipe(r, State.pantry).score;

    const ingHtml = scaled.map(i => `
      <li class="ingredient-item">
        <span>${i.item}</span>
        <span class="qty">${i.qty} ${i.unit}</span>
      </li>
    `).join('');

    const stepsHtml = r.steps.map(s => `<li>${s}</li>`).join('');

    const card = $(`
      <div class="grid gap-4 md:grid-cols-2">
        <div class="p-4 rounded-xl bg-[#F8FFFE] ring-1 ring-black/5">
          <h3 class="recipe-title text-2xl">${r.name}</h3>
          <p class="mt-1 text-sm text-[#64748B]">${r.country}</p>
          <div class="mt-3">
            <h4 class="font-semibold">Ingredients</h4>
            <ul class="mt-2 space-y-2">${ingHtml}</ul>
          </div>
          <div class="mt-4">
            <button id="btn-build-list" class="btn-primary bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-dark)] focus:ring-[var(--mint)]">Make shopping list</button>
          </div>
        </div>
        <div class="p-4 rounded-xl bg-white ring-1 ring-black/5">
          <h4 class="font-semibold">Steps</h4>
          <ol class="recipe-steps mt-2 list-decimal list-inside space-y-2">${stepsHtml}</ol>
        </div>
      </div>
    `);

    $els.recipeCard.hide().html(card).fadeIn(200);
    $els.matchScore.text(`Match: ${score} percent`);
    $els.countryBadge.text(r.country);
  }

  function renderShopping(){
    if(!State.shopping || State.shopping.length === 0){
      $els.shopList.html('<p class="text-[#64748B]">No items to buy. Build a list from a recipe.</p>');
      return;
    }
    const items = State.shopping.map((it, idx) => {
      const checked = it.purchased ? 'checked' : '';
      return `
        <div class="shopping-item ${it.purchased ? 'purchased':''}" data-index="${idx}">
          <input type="checkbox" data-action="toggle-purchase" data-index="${idx}" ${checked} aria-label="Mark ${it.item} purchased"/>
          <div class="flex-1">
            <div class="font-semibold">${it.item}</div>
            <div class="text-sm text-[#64748B]">${it.qty} ${it.unit || ''}</div>
          </div>
          <button class="btn-ghost" data-action="remove-shopping" data-index="${idx}">Remove</button>
        </div>`;
    }).join('');
    $els.shopList.html(items);
  }

  function suggestRecipeByCountry(){
    const pool = window.App.Data.recipes.filter(r => r.country === State.country);
    if(pool.length === 0) return null;
    const scored = pool.map(r => ({ r, s: window.App.Utils.scoreRecipe(r, State.pantry).score }))
      .sort((a,b) => b.s - a.s);
    return scored[0].r;
  }

  function makeShoppingFromCurrent(){
    if(!State.currentRecipe) return;
    const base = State.currentRecipe.baseServings || 4;
    const factor = Math.max(1, Number(State.servings) || base) / base;
    const scaled = window.App.Utils.scaleIngredients(State.currentRecipe.ingredients, factor);
    const tempRecipe = { ...State.currentRecipe, ingredients: scaled };
    const missing = window.App.Utils.computeShoppingList(tempRecipe, State.pantry);
    State.shopping = missing.map(m => ({ ...m, purchased:false }));
    save();
    renderShopping();
  }

  function bind(){
    $els.pantryForm.on('submit', function(e){
      e.preventDefault();
      const raw = ($els.pantryInput.val() || '').trim();
      if(!raw) return;
      const clean = window.App.Utils.normalizeItem(raw);
      if(!clean) return;
      if(!State.pantry.includes(clean)){
        State.pantry.push(clean);
        save();
        renderPantry();
      }
      $els.pantryInput.val('');
      // update match score preview if recipe exists
      if(State.currentRecipe) renderRecipe();
    });

    $els.pantryList.on('click', '[data-action="remove-pantry"]', function(){
      const idx = Number($(this).data('index'));
      State.pantry.splice(idx,1);
      save();
      renderPantry();
      if(State.currentRecipe) renderRecipe();
    });

    $els.clearPantry.on('click', function(){
      State.pantry = [];
      save();
      renderPantry();
      if(State.currentRecipe) renderRecipe();
    });

    $els.country.on('change', function(){
      State.country = $(this).val();
      save();
      $els.countryBadge.text(State.country);
    });

    $els.servings.on('input change', function(){
      const v = Math.max(1, Number($(this).val()) || 1);
      State.servings = v;
      save();
      if(State.currentRecipe) renderRecipe();
    });

    $els.suggest.on('click', async function(){
      const $btn = $(this);
      const originalText = $btn.text();
      $btn.prop('disabled', true).text('Suggesting...');
      let r = null;
      try{
        if(window.App && window.App.LLM){
          r = await window.App.LLM.recommend(State.pantry, State.country);
        }
      }catch(e){ /* ignore and fallback */ }
      // Safeguard: if LLM choice is worse than heuristic best by score, use the better match
      const best = suggestRecipeByCountry();
      if(!r){
        r = best;
      } else if(best){
        const rScore = window.App.Utils.scoreRecipe(r, State.pantry).score;
        const bScore = window.App.Utils.scoreRecipe(best, State.pantry).score;
        if(bScore > rScore){ r = best; }
      }
      if(r){
        State.currentRecipe = r;
        save();
        renderRecipe();
      } else {
        $els.recipeCard.html('<div class="text-[#64748B]">No recipes for selected country.</div>');
      }
      $btn.prop('disabled', false).text(originalText);
    });

    $els.naija.on('click', function(){
      const r = window.App.Utils.pickRandomNigeria(window.App.Data.recipes);
      if(r){ State.currentRecipe = r; save(); renderRecipe(); }
    });

    $els.recipeCard.on('click', '#btn-build-list', function(){
      makeShoppingFromCurrent();
      $('html, body').animate({ scrollTop: $els.shopList.offset().top - 80 }, 300);
    });

    $els.shopList.on('change', '[data-action="toggle-purchase"]', function(){
      const idx = Number($(this).data('index'));
      State.shopping[idx].purchased = !!$(this).is(':checked');
      save();
      renderShopping();
    });

    $els.shopList.on('click', '[data-action="remove-shopping"]', function(){
      const idx = Number($(this).data('index'));
      State.shopping.splice(idx,1);
      save();
      renderShopping();
    });

    $els.btnClearList.on('click', function(){
      State.shopping = [];
      save();
      renderShopping();
    });

    $els.btnCopy.on('click', async function(){
      if(!navigator.clipboard){
        // fallback
        const text = State.shopping.map(i => `- ${i.item} (${i.qty} ${i.unit || ''})`).join('\n');
        const ta = $('<textarea>').val(text).appendTo('body').select();
        document.execCommand('copy');
        ta.remove();
        $(this).text('Copied').delay(1000).queue(function(next){ $(this).text('Copy'); next(); });
        return;
      }
      const text = State.shopping.map(i => `- ${i.item} (${i.qty} ${i.unit || ''})`).join('\n');
      try{ await navigator.clipboard.writeText(text); $(this).text('Copied'); setTimeout(() => $(this).text('Copy'), 1000); }catch(e){ /* ignore */ }
    });
  }

  function initialPopulate(){
    renderCountries();
    renderIngredientSuggestions();
    renderPantry();
    renderRecipe();
    renderShopping();
    $('#btn-help').on('click', function(e){
      e.preventDefault();
      alert('Add your pantry items, pick a country, then tap Suggest recipe. Use Make shopping list to get only what you need.');
    });
  }

  // Export API
  window.App.init = function(){
    cacheDom();
    load();
    bind();

    // Preload AI model on app open and reflect progress in UI
    try{
      if(window.App.LLM){
        window.App.LLM.onProgress(function(info){
          if(!$els.llmBanner || $els.llmBanner.length === 0) return;
          const pct = Math.max(0, Math.min(100, Math.round(((info && typeof info.progress === 'number') ? info.progress : 0) * 100)));
          const isActive = pct < 100 && (!window.App.LLM.isReady() || window.App.LLM.loading || window.App.LLM.runtimeLoading);
          if(isActive){
            $els.llmBanner.removeClass('hidden');
            $els.llmText.text(info && info.text ? info.text : 'Loading AI model…');
            $els.llmPct.text(pct + '%');
            $els.llmBar.css('width', pct + '%');
          } else {
            // Ensure the banner stays hidden once loading completes or the model is already ready
            $els.llmPct.text('100%');
            $els.llmBar.css('width', '100%');
            setTimeout(function(){ $els.llmBanner.addClass('hidden'); }, 150);
          }
        });
        if(!window.App.LLM.isReady()){
          $els.llmBanner.removeClass('hidden');
          $els.llmText.text('Preparing AI model…');
          $els.llmPct.text('0%');
          $els.llmBar.css('width', '0%');
          setTimeout(function(){ window.App.LLM.ensure(); }, 0);
        }
      }
    }catch(e){ /* ignore */ }
  };

  window.App.render = function(){
    initialPopulate();
  };
})();
