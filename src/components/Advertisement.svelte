<script>
    // what ad are we loading?
    export let adCodeId;
    
    const targetingId = "2103828";

    // run the script for the ad
    import {onMount} from 'svelte';
    let container;
    onMount(() => {
		container = arcAds.registerAd( {
            id: 'acm-ad-tag-' + adCodeId,
            slotName: 'dfp_default',
            dimensions: [[300,250], "fluid"],
            targeting: {
                "pos":adCodeId,
                "id":targetingId,
                "url_type":"post"
            },
            prerender: window.addLazyLoad,
        } );
        return container;
	});
</script>
<div class="acm-ad-container acm-ad-container-bordered">
    <div class="a-text-around-ad a-text-before-ad">
        <p>Article continues after advertisement</p>
    </div>
    <div class="acm-ad ad-{adCodeId}" id="acm-ad-tag-{adCodeId}"></div>
</div>
<div bind:this={container} />
