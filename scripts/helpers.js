(function(){
  // Create namespace
  window.App = window.App || {};

  // Utility helpers and simple storage
  const Storage = {
    get(key, fallback){
      try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; }
    },
    set(key, value){
      try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ /* ignore */ }
    },
    remove(key){ try{ localStorage.removeItem(key); }catch(e){} }
  };

  const aliases = {
    tomatoes:"tomato",
    onions:"onion",
    peppers:"pepper",
    chilli:"chili",
    chillies:"chili",
    bonnet:"scotch bonnet",
    "red bell pepper":"bell pepper",
    "green bell pepper":"bell pepper",
    "groundnut oil":"peanut oil",
    groundnuts:"peanut",
    peanuts:"peanut",
    garri:"cassava flakes",
    cabbage:"cabbage",
    scallions:"spring onion",
    coriander:"cilantro",
    beans:"black eyed pea",
    bean:"black eyed pea",
    "black eyed beans":"black eyed pea",
    "black eye beans":"black eyed pea",
    "black eyed pea":"black eyed pea",
    "black-eyed pea":"black eyed pea",
    "black-eyed peas":"black eyed pea",
    "blackeyed pea":"black eyed pea",
    "blackeyed beans":"black eyed pea",
    chickpeas:"chickpea",
    garbanzo:"chickpea"
  };

  function normalizeItem(str){
    if(!str) return "";
    let s = String(str).toLowerCase().trim();
    s = s.replace(/[^a-z0-9\s]/g, "");
    // simple singularization
    if(s.endsWith("es")) s = s.slice(0,-2);
    else if(s.endsWith("s")) s = s.slice(0,-1);
    if(aliases[s]) s = aliases[s];
    return s;
  }

  function uniq(arr){ return Array.from(new Set(arr)); }

  function scoreRecipe(recipe, pantry){
    const have = new Set(pantry.map(normalizeItem));
    const needs = recipe.ingredients.map(i => normalizeItem(i.item));
    const matched = needs.filter(n => have.has(n));
    const score = Math.round((matched.length / Math.max(1, needs.length)) * 100);
    return { score, matched, needs };
  }

  function scaleIngredients(ingredients, factor){
    return ingredients.map(i => {
      const q = typeof i.qty === 'number' ? +(i.qty * factor).toFixed(2) : i.qty;
      return { item: i.item, qty: q, unit: i.unit || "" };
    });
  }

  function computeShoppingList(recipe, pantry){
    const have = new Set(pantry.map(normalizeItem));
    const missing = [];
    for(const ing of recipe.ingredients){
      const n = normalizeItem(ing.item);
      if(!have.has(n)) missing.push({ item: ing.item, qty: ing.qty, unit: ing.unit || "" });
    }
    return missing;
  }

  function pickRandomNigeria(recipes){
    const list = recipes.filter(r => r.country === 'Nigeria');
    if(list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  // Data: countries and recipes
  const countries = [
    'Nigeria','Ghana','Kenya','South Africa','India','Italy','United States'
  ];

  const recipes = [
    {
      id:'jollof-rice',
      name:'Jollof Rice',
      country:'Nigeria',
      tags:['rice','stew','party'],
      baseServings:4,
      ingredients:[
        {item:'rice', qty:2, unit:'cups'},
        {item:'tomato', qty:4, unit:'large'},
        {item:'tomato paste', qty:3, unit:'tbsp'},
        {item:'bell pepper', qty:1, unit:'large'},
        {item:'onion', qty:1, unit:'large'},
        {item:'scotch bonnet', qty:1, unit:''},
        {item:'chicken stock', qty:2, unit:'cups'},
        {item:'vegetable oil', qty:3, unit:'tbsp'},
        {item:'thyme', qty:1, unit:'tsp'},
        {item:'curry powder', qty:1, unit:'tsp'},
        {item:'bay leaf', qty:2, unit:''},
        {item:'salt', qty:1, unit:'tsp'},
        {item:'black pepper', qty:0.5, unit:'tsp'}
      ],
      steps:[
        'Blend tomato, bell pepper, onion, and scotch bonnet.',
        'Fry blended mix with oil and tomato paste until reduced.',
        'Stir in stock and spices, bring to a simmer.',
        'Add rinsed rice, cover, and cook on low until tender.',
        'Fluff and serve.'
      ]
    },
    {
      id:'egusi-soup',
      name:'Egusi Soup',
      country:'Nigeria',
      tags:['soup'],
      baseServings:4,
      ingredients:[
        {item:'ground egusi', qty:1, unit:'cup'},
        {item:'palm oil', qty:4, unit:'tbsp'},
        {item:'spinach', qty:4, unit:'cups'},
        {item:'beef', qty:400, unit:'g'},
        {item:'crayfish', qty:1, unit:'tbsp'},
        {item:'onion', qty:1, unit:'medium'},
        {item:'scotch bonnet', qty:1, unit:''},
        {item:'seasoning cubes', qty:1, unit:''},
        {item:'salt', qty:1, unit:'tsp'}
      ],
      steps:[
        'Season and cook beef until tender, reserve stock.',
        'Heat palm oil, add onion, crayfish, and egusi paste.',
        'Pour in meat stock and pepper, simmer.',
        'Add beef and spinach, cook briefly and adjust seasoning.'
      ]
    },
    {
      id:'suya',
      name:'Suya',
      country:'Nigeria',
      tags:['grill'],
      baseServings:4,
      ingredients:[
        {item:'beef', qty:500, unit:'g'},
        {item:'peanut powder', qty:3, unit:'tbsp'},
        {item:'cayenne', qty:1, unit:'tsp'},
        {item:'salt', qty:1, unit:'tsp'},
        {item:'peanut oil', qty:1, unit:'tbsp'},
        {item:'onion', qty:1, unit:'small'}
      ],
      steps:[
        'Slice beef thin and toss with peanut powder, cayenne, and salt.',
        'Thread on skewers, brush with oil.',
        'Grill hot until smoky and cooked through. Serve with sliced onion.'
      ]
    },
    {
      id:'moi-moi',
      name:'Moi Moi',
      country:'Nigeria',
      tags:['steamed'],
      baseServings:4,
      ingredients:[
        {item:'black eyed pea', qty:2, unit:'cups'},
        {item:'bell pepper', qty:1, unit:''},
        {item:'scotch bonnet', qty:1, unit:''},
        {item:'onion', qty:1, unit:''},
        {item:'vegetable oil', qty:3, unit:'tbsp'},
        {item:'salt', qty:1, unit:'tsp'},
        {item:'egg', qty:2, unit:''}
      ],
      steps:[
        'Soak and peel beans, blend with peppers and onion to a smooth batter.',
        'Season with oil and salt, fold in chopped eggs if using.',
        'Steam in ramekins or leaves until set.'
      ]
    },
    {
      id:'akara',
      name:'Akara',
      country:'Nigeria',
      tags:['fried'],
      baseServings:4,
      ingredients:[
        {item:'black eyed pea', qty:2, unit:'cups'},
        {item:'onion', qty:1, unit:''},
        {item:'pepper', qty:1, unit:''},
        {item:'salt', qty:0.5, unit:'tsp'},
        {item:'vegetable oil', qty:3, unit:'cups'}
      ],
      steps:[
        'Soak and peel beans. Blend with onion and pepper into a thick paste.',
        'Season and deep fry spoonfuls until golden.'
      ]
    },
    {
      id:'plantain-egg-sauce',
      name:'Fried Plantain with Egg Sauce',
      country:'Nigeria',
      tags:['quick'],
      baseServings:2,
      ingredients:[
        {item:'plantain', qty:2, unit:'ripe'},
        {item:'egg', qty:4, unit:''},
        {item:'tomato', qty:2, unit:''},
        {item:'onion', qty:0.5, unit:''},
        {item:'pepper', qty:1, unit:''},
        {item:'vegetable oil', qty:4, unit:'tbsp'},
        {item:'salt', qty:0.5, unit:'tsp'}
      ],
      steps:[
        'Fry sliced plantain until golden.',
        'Scramble eggs with sauteed tomato, onion, and pepper. Serve together.'
      ]
    },
    {
      id:'waakye',
      name:'Waakye',
      country:'Ghana',
      tags:['rice','beans'],
      baseServings:4,
      ingredients:[
        {item:'rice', qty:2, unit:'cups'},
        {item:'black eyed pea', qty:1, unit:'cup'},
        {item:'salt', qty:1, unit:'tsp'}
      ],
      steps:[
        'Cook beans until almost tender.',
        'Add rice and salt, cook until both are done.'
      ]
    },
    {
      id:'kelewele',
      name:'Kelewele',
      country:'Ghana',
      tags:['fried','snack'],
      baseServings:4,
      ingredients:[
        {item:'plantain', qty:3, unit:'ripe'},
        {item:'ginger', qty:1, unit:'tbsp'},
        {item:'cayenne', qty:0.5, unit:'tsp'},
        {item:'clove', qty:0.25, unit:'tsp'},
        {item:'salt', qty:0.5, unit:'tsp'},
        {item:'vegetable oil', qty:3, unit:'cups'}
      ],
      steps:[
        'Marinate plantain cubes with spices.',
        'Fry until caramelized and crisp.'
      ]
    },
    {
      id:'ugali-sukuma',
      name:'Ugali with Sukuma Wiki',
      country:'Kenya',
      tags:['staple'],
      baseServings:4,
      ingredients:[
        {item:'maize flour', qty:2, unit:'cups'},
        {item:'water', qty:4, unit:'cups'},
        {item:'collard green', qty:4, unit:'cups'},
        {item:'tomato', qty:2, unit:''},
        {item:'onion', qty:1, unit:''},
        {item:'vegetable oil', qty:2, unit:'tbsp'},
        {item:'salt', qty:1, unit:'tsp'}
      ],
      steps:[
        'Cook maize flour in boiling water until stiff ugali forms.',
        'Saute onion, tomato, and greens. Serve with ugali.'
      ]
    },
    {
      id:'nyama-choma',
      name:'Nyama Choma',
      country:'Kenya',
      tags:['grill'],
      baseServings:4,
      ingredients:[
        {item:'beef', qty:800, unit:'g'},
        {item:'lemon', qty:1, unit:''},
        {item:'chili', qty:1, unit:''},
        {item:'salt', qty:1, unit:'tsp'}
      ],
      steps:[
        'Season meat with lemon, salt, and chili.',
        'Grill over hot coals until done to preference.'
      ]
    },
    {
      id:'bobotie',
      name:'Bobotie',
      country:'South Africa',
      tags:['bake'],
      baseServings:4,
      ingredients:[
        {item:'minced beef', qty:500, unit:'g'},
        {item:'bread', qty:2, unit:'slices'},
        {item:'milk', qty:1, unit:'cup'},
        {item:'onion', qty:1, unit:''},
        {item:'curry powder', qty:1, unit:'tbsp'},
        {item:'chutney', qty:2, unit:'tbsp'},
        {item:'egg', qty:2, unit:''},
        {item:'turmeric', qty:0.5, unit:'tsp'}
      ],
      steps:[
        'Soak bread in milk. Fry onion, spices, and beef.',
        'Mix in bread and chutney, bake topped with egg custard until set.'
      ]
    },
    {
      id:'bunny-chow',
      name:'Bunny Chow',
      country:'South Africa',
      tags:['street'],
      baseServings:4,
      ingredients:[
        {item:'bread loaf', qty:1, unit:''},
        {item:'chicken', qty:500, unit:'g'},
        {item:'curry powder', qty:1, unit:'tbsp'},
        {item:'tomato', qty:2, unit:''},
        {item:'onion', qty:1, unit:''},
        {item:'garlic', qty:2, unit:'cloves'},
        {item:'ginger', qty:1, unit:'tsp'}
      ],
      steps:[
        'Cook a quick chicken curry.',
        'Hollow bread loaf and fill with curry.'
      ]
    },
    {
      id:'chana-masala',
      name:'Chana Masala',
      country:'India',
      tags:['vegan'],
      baseServings:4,
      ingredients:[
        {item:'chickpea', qty:2, unit:'cups'},
        {item:'tomato', qty:3, unit:''},
        {item:'onion', qty:1, unit:''},
        {item:'garlic', qty:3, unit:'cloves'},
        {item:'ginger', qty:1, unit:'tsp'},
        {item:'garam masala', qty:1, unit:'tbsp'},
        {item:'cumin', qty:1, unit:'tsp'},
        {item:'coriander', qty:1, unit:'tsp'}
      ],
      steps:[
        'Saute onion, garlic, and ginger with spices.',
        'Add tomato and chickpeas, simmer until thick.'
      ]
    },
    {
      id:'spaghetti-pomodoro',
      name:'Spaghetti Pomodoro',
      country:'Italy',
      tags:['pasta'],
      baseServings:4,
      ingredients:[
        {item:'spaghetti', qty:400, unit:'g'},
        {item:'tomato', qty:4, unit:''},
        {item:'garlic', qty:3, unit:'cloves'},
        {item:'basil', qty:1, unit:'handful'},
        {item:'olive oil', qty:2, unit:'tbsp'},
        {item:'salt', qty:1, unit:'tsp'}
      ],
      steps:[
        'Cook spaghetti al dente.',
        'Simmer tomato with garlic and oil, toss with pasta and basil.'
      ]
    },
    {
      id:'mac-and-cheese',
      name:'Mac and Cheese',
      country:'United States',
      tags:['comfort'],
      baseServings:4,
      ingredients:[
        {item:'macaroni', qty:300, unit:'g'},
        {item:'cheddar', qty:250, unit:'g'},
        {item:'milk', qty:2, unit:'cups'},
        {item:'butter', qty:3, unit:'tbsp'},
        {item:'flour', qty:2, unit:'tbsp'},
        {item:'salt', qty:1, unit:'tsp'}
      ],
      steps:[
        'Make a roux with butter and flour, whisk in milk.',
        'Melt in cheese and combine with cooked macaroni.'
      ]
    }
  ];

  // Export to namespace
  window.App.Storage = Storage;
  window.App.Utils = {
    normalizeItem,
    uniq,
    scoreRecipe,
    scaleIngredients,
    computeShoppingList,
    pickRandomNigeria,
    countries
  };
  window.App.Data = { recipes };
})();
