<style>
    .m-menu-contest-actions {
        border-bottom: 2px solid #d6d6da;
        border-top: 1px solid #d6d6da;
        margin-bottom: 1.5em;
        padding-bottom: 0;
        z-index: 10;
    }
    .m-menu-contest-actions ul {
        font-size: var(--scale-1);
    }
    .m-menu-contest-actions ul button {
        padding: .25em .5em;
        color: #135b7e;
    }
    .m-menu-contest-actions ul button:hover, .m-menu-contest-actions ul button:focus {
        background-color: #135b7e;
        color: #fff;
    }
    .o-map-wrapper-active {
        height: 300px;
    }
</style>

<script>
    export let contest;
    export let contestDetailView;
    export let label;
    export let mapAvailable;
    
    import { link, querystring, location } from 'svelte-spa-router';

    import { navigationContext } from '../data/navigationContext.js';

    import { isPaginated } from './../stores.js';

    // map
    let Map;
    let showMap = false;
    const mapDelay = 300;
    const sleep = ms => new Promise(f => setTimeout(f, ms));
    async function loadMap() {
        showMap = true;
        await sleep(mapDelay); // simulate network delay
        Map = (await import('./Map.svelte')).default;
    }

    function getPageLink() {
        let url = "";
        let linkParams = new URLSearchParams($querystring);
        url = ($location + '?' + linkParams).replaceAll('+', '%20');
        return url;
    }

    // related contests
    function getRelatedContestLink(contest) {
        let path = navigationContext([contest], contest, isPaginated, $location, $querystring);
        let menuLink = {};
        
        if (path) {
            if (path.scope) {
                menuLink.href = '/contests/?scope=' + path.scope;
            }
            if (path.search) {
                menuLink.href = '/search/?q=' + path.search;
            }
            if ( path.label ) {
                menuLink.text = 'More ' + decodeURIComponent(path.label) + ' ' + label + 's';
            } else {
                menuLink.text = path.text;
            }
            if (getPageLink().toLowerCase() === menuLink.href.toLowerCase()) {
                delete menuLink.href;
            }
        }
        return menuLink;
    }
</script>

<nav class="m-subnav-navigation m-menu-contest-actions">
    <ul>
        {#if (contestDetailView === false)}
            <li><a href="/contest/?id={contest.id}" use:link>Show only this {label}</a></li>
            {#if mapAvailable}
                {#if showMap}
                    <li><button value="" on:click="{() => showMap = false}" class="a-button-text-link">Hide map</button></li>
                {:else}
                    <li><button value="" on:click="{loadMap}" class="a-button-text-link">Show map</button></li>
                {/if}
            {/if}
        {:else}
            <li><a href="/" use:link>Back to dashboard</a></li>
        {/if}
        {#if getRelatedContestLink(contest).href && getRelatedContestLink(contest).text}
            <li><a href="{getRelatedContestLink(contest).href}" use:link>{getRelatedContestLink(contest).text}</a></li>
        {/if}
    </ul>
</nav>

{#if mapAvailable}
    {#if showMap}
        <div class="o-map-wrapper-active">
            <div class="m-map-container">
                <svelte:component this={Map} boundary_slug={contest.boundary}/>
            </div>
        </div>
    {/if}
{/if}