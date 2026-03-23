// application state
const state = {
  allfeatures: new Set(),
  demo: [],
  geolayer: [],
  maxage: 0,   
  quartieri: new Set(),
  view: [],
  // filters
  filters: {
    ages: {
      min: 0,
      max: 120 
    },
    countries: new Set(),
    quartieri: new Set(),
    sex: new Set([1,2])        
  },
  colors: {
    bg: `#000000`,
    fg: `#D1D0D0`,
    hl: `#CFB53B`
  }
}

// loading
async function loadDemo() {
  const response = await fetch('./pop26.json')
  const jsondata = await response.json()
  state.quartieri = [...new Set(jsondata.data.map(r => r.quartiere))].sort()
  return aq.from(jsondata.data);
}

async function loadMapData() {
  const response = await fetch('./worldsimplified.json')
  return await response.json()
}

async function extractAreas() {
  const response = await fetch('./areas.json');
  const data = await response.json();
  const map = new Map(Object.entries(data));
  return map; 
}

// gui
function lighton(button) {
    button.style.color = state.colors.hl;
    button.style.borderColor = state.colors.hl;
  }

function lightoff(button) {
  button.style.color = state.colors.fg;
  button.style.borderColor = state.colors.fg;
}

function setupAgeSlider() {
  const agemin = document.getElementById('age-min');

  // all'inizio sono selezionate tutte le età
  agemin.style.background = `linear-gradient(to right,
                            #ffffe0 0%, 
                            #ffffe0 100%)`;  

  const agemax = document.getElementById('age-max');
  const label = document.getElementById('age-range-label');
  agemin.max = state.maxage;
  agemax.max = state.maxage;
  agemax.value = state.maxage;
  const updateRange = () => {
    if (parseInt(agemin.value)>parseInt(agemax.value)) {
      let temp = agemin.value;
      agemin.value = agemax.value;
      agemax.value = temp;      
    }
    label.textContent = `${agemin.value} - ${agemax.value}`;
    state.filters.ages.min = parseInt(agemin.value);
    state.filters.ages.max = parseInt(agemax.value);    
    const permin = (agemin.value/state.maxage)*100+0.1;
    const permax = (agemax.value/state.maxage)*100-0.1;
    agemin.style.background = `linear-gradient(to right,
                             #0f0f0f 0%, 
                             #0f0f0f ${permin}%, 
                             #ffffe0 ${permin}%, 
                             #ffffe0 ${permax}%, 
                             #0f0f0f ${permax}%, 
                             #0f0f0f 100%)`;  
    applyFilters(); 
  }
  agemin.oninput = updateRange;
  agemax.oninput = updateRange; 
}

function setupSex() {
  const males = document.getElementById('sex-males');
  const females = document.getElementById('sex-females');

  if (state.filters.sex.has(1)) {lighton(males);}
  else {lightoff(males);}
  if (state.filters.sex.has(2)) {lighton(females);}
  else {lightoff(females);}

  males.addEventListener('click',() => {
    if (state.filters.sex.has(1)) {
      state.filters.sex.delete(1);
      lightoff(males); 
    }
    else {
      state.filters.sex.add(1);
      lighton(males); 
    }
    applyFilters(); 
  });

  females.addEventListener('click',() => {
    if (state.filters.sex.has(2)) {
      state.filters.sex.delete(2);
      lightoff(females); 
    }
    else {
      state.filters.sex.add(2);
      lighton(females); 
    } 
    applyFilters(); 
  });
}

function setupCheckboxes(options,id) {
  const checkboxes = document.getElementById(id)
  options.forEach(option => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = option
    checkbox.checked = true; 
    state.filters.quartieri.add(checkbox.value);
    checkbox.addEventListener("change",(e) => {
      if (e.target.checked) {
        state.filters.quartieri.add(checkbox.value);
      }
      else {
        state.filters.quartieri.delete(checkbox.value)
      }      
      updateQuartieriButtonsColor();
      applyFilters(); 
    });
    label.appendChild(checkbox);
    label.append(" "+option);
    checkboxes.appendChild(label);    
  });
}

function setupQuartieriAll() {
  const selectall = document.getElementById('quartieri-select-all');
  const deselectall = document.getElementById('quartieri-deselect-all');
  updateQuartieriButtonsColor();

  selectall.addEventListener('click',() => {
    let checkboxes = document.querySelectorAll("#quartieri input[type='checkbox']");
    checkboxes.forEach(checkbox => {
      checkbox.checked = true; 
      state.filters.quartieri.add(checkbox.value);
    })  
    updateQuartieriButtonsColor();
    applyFilters();   
  }); 

  deselectall.addEventListener('click',() => {
    let checkboxes = document.querySelectorAll("#quartieri input[type='checkbox']");
    checkboxes.forEach(checkbox => {
      checkbox.checked = false; 
      state.filters.quartieri.delete(checkbox.value);
    })
    updateQuartieriButtonsColor();
    applyFilters(); 
  }); 
}

function updateQuartieriButtonsColor() {
  let selectall = document.getElementById('quartieri-select-all');
  let deselectall = document.getElementById('quartieri-deselect-all');
  if (state.filters.quartieri.size == 13) {
    lighton(selectall);
    lightoff(deselectall);
  }
  else if (state.filters.quartieri.size == 0) {
    lightoff(selectall); 
    lighton(deselectall);
  }
  else {
    lightoff(selectall);
    lightoff(deselectall);
  }
}

function updateAppearance() {
  if (state.filters.countries.size == 0) {lighton(document.getElementById('deselect-all-countries'));}
  else {lightoff(document.getElementById('deselect-all-countries'));}

  let allexitaly = true;
  for (const [area,countries] of state.areas) {
    let set = new Set(countries); 
    if (set.isSubsetOf(state.filters.countries)) {lighton(document.getElementById(area));}
    else {
      if (!set.has('Italy')) {
        allexitaly = false;
      }       
      lightoff(document.getElementById(area));
    }
  }

  if (allexitaly) {lighton(document.getElementById('ex-italy'));}
  else {lightoff(document.getElementById('ex-italy'));}

  if (allexitaly && state.filters.countries.has('Italy')) {lighton(document.getElementById('select-all-countries'));}
  else {lightoff(document.getElementById('select-all-countries'));}
}

async function setupWorld() {
  const map = L.map('map',{   
    maxBounds: L.latLngBounds(L.latLng(-90,-180),L.latLng(90, 180)),
    maxBoundsViscosity: 1.0,  
    minZoom: 2
    })
  .setView([44.8015,10.3279],2);

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenStreetMap contributors',
      noWrap: true,
      bounds: L.latLngBounds(L.latLng(-90,-180),L.latLng(90, 180)) }
  )
  .addTo(map);

  const worldata = await loadMapData();
  state.allfeatures = new Set(worldata.features.map(f => f.properties.NAM_0));
  let geolayer; 
  geolayer = L.geoJson(worldata,{
      style: basicCountryStyle,
      onEachFeature: (feature,layer) => {
        let country = feature.properties.NAM_0;
        layer.bindTooltip(country,{
            sticky: true,       
            direction: "auto",  
            opacity: 0.9
        }); 
        layer.on('click',(e) => {
          L.DomEvent.stopPropagation(e)
          if (state.filters.countries.has(country)) {
            state.filters.countries.delete(country);
            layer.setStyle(basicCountryStyle(layer.feature)); 
          }
          else {
            state.filters.countries.add(country);
            layer.setStyle(stressCountry(layer.feature)); 
          }  
          updateAppearance();         
          applyFilters(); 
        });
      }
    }
  )
  .addTo(map); 

  map.on('click',() => {
    geolayer.eachLayer(l => geolayer.resetStyle(l));
    state.filters.countries.clear();  
    updateAppearance(); 
    applyFilters();   
  }); 

  state.geolayer = geolayer;
}

function setupCountriesAll() {
  const selectall = document.getElementById('select-all-countries'); 
  const deselectall = document.getElementById('deselect-all-countries'); 
  selectall.addEventListener('click',() => {
    state.filters.countries.clear();
    state.geolayer.eachLayer((layer) => {
      state.filters.countries.add(layer.feature.properties.NAM_0);    
      layer.setStyle(stressCountry(layer.feature)); 
    }); 
    updateAppearance();
    applyFilters(); 
  });
  deselectall.addEventListener('click',() => {
    state.filters.countries.clear();
    state.geolayer.eachLayer((layer) => {
      layer.setStyle(basicCountryStyle(layer.feature)); 
    }); 
    updateAppearance();
    applyFilters(); 
  });
}

function setupExItaly() {
  const button = document.getElementById('ex-italy');
  let allfeatures = state.allfeatures; 
  allfeatures.delete('Italy'); 
  const exitaly = new Set(allfeatures); 
  button.addEventListener('click',() => {
    if (exitaly.isSubsetOf(state.filters.countries)) {
      state.geolayer.eachLayer((layer) => {
        country = layer.feature.properties.NAM_0;
        if (exitaly.has(country)) {
          state.filters.countries.delete(country); 
          layer.setStyle(basicCountryStyle(layer.feature));
        }
      }); 
    }
    else {
      state.geolayer.eachLayer((layer) => {
        country = layer.feature.properties.NAM_0;
        if (exitaly.has(country)) {
          state.filters.countries.add(country); 
          layer.setStyle(stressCountry(layer.feature));
        }
      }); 
    }
    updateAppearance();
    applyFilters(); 
  });
}

function setupAreas() {
  const container = document.getElementById('areas-buttons'); 
  state.areas.forEach((tostress,area) => {
    const button = document.createElement('button');
    button.id = area; 
    button.textContent = area;
    const countries = new Set(tostress);
    button.addEventListener('click',() => {
      let geolayer = state.geolayer;
      if (countries.isSubsetOf(state.filters.countries)) {
        geolayer.eachLayer((layer) => {
          const country = layer.feature.properties.NAM_0;        
          if (countries.has(country)) {
            state.filters.countries.delete(country);
            layer.setStyle(basicCountryStyle(layer.feature)); 
          }
        });
      }
      else {
        geolayer.eachLayer((layer) => {
          const country = layer.feature.properties.NAM_0;        
          if (countries.has(country)) {
            state.filters.countries.add(country);
            layer.setStyle(stressCountry(layer.feature)); 
          }
        });
      }        
      updateAppearance(); 
      applyFilters();   
    });
    container.appendChild(button); 
  });

  state.filters.countries.clear();
  state.geolayer.eachLayer((layer) => {
    state.filters.countries.add(layer.feature.properties.NAM_0);    
    layer.setStyle(stressCountry(layer.feature)); 
  }); 
  updateAppearance();
  applyFilters();
}

// style
function basicCountryStyle(feature) {
    return {
        fillColor: 'grey', 
        weight: 1,           
        opacity: 1,
        color: state.colors.fg,       
        fillOpacity: 0.5
    };
}

function stressCountry(feature) {
    return {
        weight: 1,                  
        opacity: 1,
        color: state.colors.hl,
        fillOpacity: 0.5
    };
}

// apply filters
function applyFilters() {
  const filtered = state.demo.filter(aq.escape(d => {
    return d.eta >= state.filters.ages.min &&
           d.eta <= state.filters.ages.max &&
           state.filters.quartieri.has(d.quartiere) &&
           state.filters.sex.has(d.sesso);
  }));

  const counts = filtered.groupby('cittad').rollup({count: aq.op.count()}); 
  const dictionary = new Map(counts.array('cittad').map((c,i) => [c,counts.array('count')[i]]));

  const mini = new Map([...dictionary].filter(([key,val]) => state.filters.countries.has(key)));
  let min = Math.min(...mini.values());
  let max = Math.max(...mini.values());
  let range = max-min || 1; 

  let selectionvalue = [...mini.values()].reduce((a,b) => a+b,0); 
  document.getElementById('value').innerHTML = `Numero di residenti della selezione: <br><strong>${selectionvalue}</strong>`;
  state.geolayer.eachLayer((layer) => {
    country = layer.feature.properties.NAM_0;
    value = dictionary.get(country) ?? 0;
    if (state.filters.countries.has(country)) {       
      const ratio = (value-min)/range; 
      const lightness = 90-(ratio*60);   
      layer.setStyle({
        fillColor: `hsl(210,80%,${lightness}%)`,
        fillOpacity: 0.8,
      });      
    }   
    layer.setTooltipContent(`<strong>${country}</strong><br>Residenti: ${value}`);
  });
}

// main 
async function main() {  
  const op = aq.op; 
  // loading
  state.demo = await loadDemo();
  state.maxage = state.demo.rollup({max: op.max('eta')}).get('max',0); 
  state.areas = await extractAreas();

  // quartieri slicer
  setupCheckboxes(state.quartieri,"quartieri");
  setupQuartieriAll();

  // age slider
  setupAgeSlider();

  // sex buttons
  setupSex(); 

  // map
  await setupWorld();

  // areas buttons
  setupCountriesAll();
  setupExItaly();
  setupAreas();
}

main()