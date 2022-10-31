<script>
    // routing
    import {push} from 'svelte-spa-router';
    function getLocation(event) {
        event.preventDefault();
        if (navigator.geolocation) {      
                navigator.geolocation.getCurrentPosition(showPosition);    
        } 
    }

    function showPosition(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        //console.log(`longitude: ${ longitude } | latitude: ${ latitude }`);
        if ( latitude !== '' && longitude !== '') {
            push('/search/?latitude=' + latitude + '&longitude=' + longitude);
            //console.log(`longitude: ${ longitude } | latitude: ${ latitude }`);
        }
    }
</script>

<a href="#" class="a-geolocate" on:click="{getLocation}">view contests at your current location.</a>
