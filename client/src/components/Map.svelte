<script>

    export let boundary_slug;
  
    import L from 'leaflet';
  
    const mapDefaults = {
      zoom: 10,
      center: [44.9800, -93.2636],
      trackResize: true,
      zoomControl: false,
      minZoom:6,
      maxZoom:12
    };
  
    const layerOptions = {
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; <a href="https://www.mapbox.com/feedback/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  
    const districtStyle = {  
      stroke: true,
      color: '#af8dc3',
      weight: 1.5,
      opacity: 0.9,
      fill: true,
      fillColor: '#af8dc3',
      fillOpacity: 0.2,
      clickable: false
    }
  
  
    let map;
    let mapReady = false;
  
    async function createMap(container) {
      map = new L.Map(container, mapDefaults);
      map.addControl(new L.Control.Zoom({ position: 'topright' }));
      map.attributionControl.setPrefix(false);
      L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWlubnBvc3QiLCJhIjoicUlOUkpvWSJ9.djE93rNktev9eWRJVav6xA', layerOptions).addTo(map);
  
      let url = 'https://represent-minnesota.herokuapp.com/boundaries/'
      url += boundary_slug + "/simple_shape";
      console.log(url);
  
      let response =  await fetch(`` + url);
      let boundary = await response.json();
      mapReady = true;
      let layer = L.geoJson(boundary);
      layer.setStyle(districtStyle);
      map.addLayer(layer);
      map.fitBounds(layer.getBounds());
    
    }
  
    function resizeMap() {
        if(map) { map.invalidateSize(); }
    }
  
  </script>
  
  <style>
    .map {
      height: 100%;
      width: 100%;
    }
  
    .loading {
      font-size: 2em;
      font-family: "ff-meta-web-pro", helvetica, arial, sans-serif;
      background-color: #ffffff;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      display: inline;
      padding: .5em;
      border-radius: .5em;
    }
  
  </style>
  <link href='https://api.mapbox.com/mapbox.js/v3.3.1/mapbox.css' rel='stylesheet' />
  
  <svelte:window on:resize={resizeMap} />
  
  <div class="map" use:createMap>
    {#if !mapReady }<div class="loading">Loading map&#133;</div>{/if}
  </div>