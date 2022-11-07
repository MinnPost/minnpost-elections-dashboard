<script>
    // data
    import { apiData, isPaginated } from './../stores.js';

    // settings
    import {settings} from './../settings.js';

    // routing
    import {link, location, querystring} from 'svelte-spa-router';
    import active from 'svelte-spa-router/active'

    let pageCount = 1;
    function getPageCount(apiData) {
        if (apiData.total_count > settings.limit) {
            pageCount = Math.ceil(apiData.total_count / settings.limit);
        }
        return pageCount;
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
        let currentPage = getCurrentPage($querystring);
        linkParams.delete('page');
        if (parseInt(page) === 1 && parseInt(currentPage) === 1) {
            path = '*/?' + linkParams;
        } else {
            path = '*/?' + linkParams + '&page=' + page;
        }
        path = path.replaceAll('+', '%20');
        return path;
    }

    function getCurrentPage($querystring) {
        let linkParams = new URLSearchParams($querystring);
        let currentPage = linkParams.get('page');
        if (currentPage === null) {
            currentPage = 1;
        }
        return currentPage;
    }

    const getRange = (start, end) => {
        return Array(end - start + 1)
        .fill()
        .map((v, i) => i + start)
    }

    const pagination = (currentPage, pageCount) => {
        let delta;
        if (pageCount <= 7) {
            // delta === 7: [1 2 3 4 5 6 7]
            delta = 7
        } else {
            // delta === 2: [1 ... 4 5 6 ... 10]
            // delta === 4: [1 2 3 4 5 ... 10]
            delta = currentPage > 4 && currentPage < pageCount - 3 ? 2 : 4
        }

        const range = {
            start: Math.round(currentPage - delta / 2),
            end: Math.round(currentPage + delta / 2)
        }

        if (range.start - 1 === 1 || range.end + 1 === pageCount) {
            range.start += 1
            range.end += 1
        }

        let pages =
            currentPage > delta
            ? getRange(Math.min(range.start, pageCount - delta), Math.min(range.end, pageCount))
            : getRange(1, Math.min(pageCount, delta + 1))

        const withDots = (value, pair) => (pages.length + 1 !== pageCount ? pair : [value])

        if (pages[0] !== 1) {
            pages = withDots(1, [1, '...']).concat(pages)
        }

        if (pages[pages.length - 1] < pageCount) {
            pages = pages.concat(withDots(pageCount, ['...', pageCount]))
        }

        return pages
    }

</script>

{#if $isPaginated === true}
    {#if $apiData}
        {#if (pagination(getCurrentPage($querystring), getPageCount($apiData))).length > 0}
            <div class="m-pagination">
                <ol>
                    {#if getCurrentPage() > 1}
                        <li class="a-pagination-previous"><a href="{getPageLink(parseInt(getCurrentPage()) - 1)}" use:link><i class="fas fa-chevron-left"></i> Previous</a></li>
                    {/if}
                    {#each pagination(getCurrentPage($querystring), getPageCount($apiData)) as page}
                        {#if page !== '...'}
                            {#if getCurrentPage($querystring) === page}
                                <li class="active"><span>{page}</span></li>
                            {:else}
                                <li><a href="{getPageLink(page)}" use:link use:active={{path: getActivePath(page)}}>{page}</a></li>
                            {/if}
                        {:else}
                            <li class="a-pagination-ellipsis"><span>&hellip;</span></li>
                        {/if}
                    {/each}
                    {#if getCurrentPage() > getPageCount($apiData).length}
                        <li class="a-pagination-next"><a href="{getPageLink(parseInt(getCurrentPage()) + 1)}">Next <i class="fas fa-chevron-right"></i></a></li>
                    {/if}
                </ol>
            </div>
        {/if}
    {:else}
        <p>loading...</p>
    {/if}
{/if}