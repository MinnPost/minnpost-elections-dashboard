<script>
    // data
    import { resultStore, currentPage, isPaginated } from './../stores.js';

    // routing
    import { querystring, location } from 'svelte-spa-router';
    import { navigationContext } from '../data/navigationContext.js';

    let label = 'contest';
    let titleSuffix = ' | MinnPost';
    let pageName = '';
    let defaultPageName = '2022 Minnesota Election Results Dashboard';
    let titlePrefix = '2022 Election Results for Minnesota';
    function generateTitle(resultStore) {
        let context = navigationContext(resultStore, {}, $isPaginated, $location, $querystring);
        if (context && context.label === "featured") { // we're on the dashboard
            pageName = defaultPageName;
        } else if (resultStore.length === 1) { // we're on a single contest
            if (resultStore[0].title) {
                pageName = resultStore[0].title;
            } else if (resultStore[0].office_name) {
                pageName = resultStore[0].office_name;
            }
            pageName = titlePrefix + ' ' + pageName;
        } else {
            let contextLabel = "";
            let suffix = "";
            if (context && context.label) { // we're on a specific set of results
                contextLabel = context.label.charAt(0).toUpperCase() + context.label.slice(1);
                pageName = titlePrefix + ' ' + contextLabel + ' ' + label.charAt(0).toUpperCase() + label.slice(1) + 's';
            } else { // we're on a search result
                let searchParams = new URLSearchParams($querystring);
                if (searchParams.get('q') !== null) {
                    suffix = ' for ' + decodeURIComponent(searchParams.get('q'));
                }
                if (searchParams.get('address') !== null) {
                    suffix = ' near ' + decodeURIComponent(searchParams.get('address'));
                }
                pageName = titlePrefix + ': Contest Results' + suffix;
            }
            if ($isPaginated === true && parseInt($currentPage) > 1) {
                pageName += ' | Page ' + $currentPage;
            }
        }
        return pageName + titleSuffix;
    }

    $: title = generateTitle($resultStore);
    $: {
        document.title = title;
    }
</script>

<svelte:head>
    <title>{title}</title>
</svelte:head>
