<script>
    // data
    import { apiData, isPaginated } from './../stores.js';

    // settings
    import {settings} from './../settings.js';

    // routing
    import {link, location, querystring} from 'svelte-spa-router';
    import active from 'svelte-spa-router/active'

    let totalPages = 1;
    let pagesArray = [];
    function getPages(apiData) {
        if (apiData.total_count > settings.limit) {
            totalPages = Math.ceil(apiData.total_count / settings.limit);
        }
        pagesArray = Array.from({length: totalPages}, (x, i) => i+1) // [1,2,3,4,5,6,7,8,9,10]
        return pagesArray;
    }

    function getPageLink(page) {
        let url = "";
        let linkParams = new URLSearchParams($querystring);
        linkParams.delete('page');
        if (page === 1) {
            url = $location + '?' + linkParams;
        } else {
            url = $location + '?' + linkParams + '&page=' + page;
        }
        return url
    }

    function getActivePath(page) {
        let path = "";
        let linkParams = new URLSearchParams($querystring);
        let currentPage = linkParams.get('page');
        linkParams.delete('page');
        if (page === 1 && currentPage === null) {
            path = '*/?' + linkParams;
        } else {
            path = '*/?' + linkParams + '&page=' + page;
        }
        return path;
    }

</script>

{#if $isPaginated === true}
    {#if $apiData}
        {#if (getPages($apiData)).length > 0}
            <div class="m-pagination">
                <ol>
                    {#each getPages($apiData) as page}
                        <li><a href="{getPageLink(page)}" use:link use:active={{path: getActivePath(page)}}>{page}</a></li>
                    {/each}
                    <!--<li class="a-pagination-ellipsis"><span>…</span></li>
                    <li class="a-pagination-next"><a href="/">Next <svg class="svg-inline--fa fa-chevron-right" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-right" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" data-fa-i2svg=""><path fill="currentColor" d="M96 480c-8.188 0-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L242.8 256L73.38 86.63c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l192 192c12.5 12.5 12.5 32.75 0 45.25l-192 192C112.4 476.9 104.2 480 96 480z"></path></svg><!-- <i class="fas fa-chevron-right"></i> Font Awesome fontawesome.com --><!--</a></li>-->
                </ol>
            </div>
        {/if}
    {:else}
        <p>loading...</p>
    {/if}
{/if}