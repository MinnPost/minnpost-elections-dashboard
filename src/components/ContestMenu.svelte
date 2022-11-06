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
    
    import {link, querystring, location} from 'svelte-spa-router';

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
        url = $location + '?' + linkParams;
        return url;
    }

    // related contests
    function getRelatedContestLink(contest) {
        let relatedContestPaths = [
            {
                "scope": "state",
                "label": "statewide",
            },
            {
                "scope": "us_house",
                "label": "U.S. House",
            },
            {
                "scope": "state_house",
                "label": "State House",
            },
            {
                "scope": "state_senate",
                "label": "State Senate",
            }
        ];
        if (contest.scope === 'county' && contest.place_name && contest.place_name !== '') {
            let countyPath = {
                "scope": "county",
                "search": contest.place_name + "+County",
                "label": contest.place_name + " County",
            }
            relatedContestPaths.push(countyPath);
        }
        if ($isPaginated === true && contest.sub_title !== null || contest.question_body) {
            let questionPaths = [
                {
                    "scope": "county",
                    "search": "question",
                    "text": "All ballot questions",
                },
                {
                    "scope": "municipal",
                    "search": "question",
                    "text": "All ballot questions",
                },
                {
                    "scope": "school",
                    "search": "question",
                    "text": "All ballot questions",
                }
            ];
            relatedContestPaths = relatedContestPaths.concat(questionPaths);
        }
        if ($isPaginated === true && contest.scope === 'school' && contest.title.toLowerCase().includes('School Board Member'.toLowerCase())) {
            let schoolBoardPath = {
                "scope": "school",
                "search": "School Board Member",
                "text": "All school board " + label + 's'
            }
            relatedContestPaths.push(schoolBoardPath);
        }
        let link = {};
        let path = relatedContestPaths.find((e) => e.scope == contest.scope);
        if (path) {
            if (path.scope) {
                link.href = '/contests/?scope=' + path.scope;
            }
            if (path.search) {
                link.href = '/search/?q=' + path.search;
            }
            if ( path.label ) {
                link.text = 'More ' + path.label + ' ' + label + 's';
            } else {
                link.text = path.text;
            }
            if (getPageLink() === link.href) {
                delete link.href;
            }
        }
        return link;
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