import { get, writable, derived } from 'svelte/store';
import { dashboard } from './data/dashboard.js';
import { fetchElection, fetchContests } from "./data/api.js";
import {location, querystring} from 'svelte-spa-router';
import { settings } from './settings.js';

let delay = 0;
let fetchInterval = 50000;

// when the page itself was last modified
export const pollInfo = writable({
    lastModified: new Date()
});


// current pagination
export const currentPage   = writable(1);
export const currentOffset = writable(0);
export const isPaginated   = writable(settings.paginate);
export const currentTo     = writable(settings.limit);

// store and refresh displayed results
export const resultStore = derived([location, querystring], ([$location, $querystring], set) => {
    fetchAndSet($location, $querystring, set);
    const interval = setInterval(() => {
        fetchAndSet($location, $querystring, set);
    }, fetchInterval);
    //  If you return a function from the callback, it will be called when
    //  a) the callback runs again, or b) the last subscriber unsubscribes.
    return () => {
        clearInterval(interval);
    };
}, []);

// store info about the api data
export const apiData = writable([]);

// single function for responding to the fetchAndSet promise
function respondToPromise(key, values, set) {
    let queryOffset = get(currentOffset) - 1;
    fetchContests(key, values, true, queryOffset)
        .then(result => {
            if (typeof (result.total_count) !== 'undefined') {
                isPaginated.set(true);
                if (result.total_count < settings.limit) {
                    isPaginated.set(false);
                }
            } else {
                isPaginated.set(false);
                currentTo.set(0);
            }
            if (get(isPaginated) === true) {
                if ( ( settings.limit * get(currentPage) ) <= ( result.total_count ) ) {
                    currentTo.set( ( settings.limit * get(currentPage) ) );
                } else {
                    currentTo.set(result.total_count);
                }
            }
            apiData.set(
                {
                    'total_count': result.total_count,
                    'limit': result.limit,
                    'offset': result.offset,
                }
            );
            return result.data
        })
        .then(set)
}

// routing for displayed results
function fetchAndSet($location, $querystring, set) {
    const searchParams = new URLSearchParams($querystring);
    if (searchParams.get('page') !== null) {
        currentPage.set(parseInt(searchParams.get('page')));
    } else {
        currentPage.set(1);
    }
    currentOffset.set((get(currentPage) - 1) * settings.limit + 1);
    if ($location.startsWith("/search/")) {
        if (searchParams.get('q') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //set(fetchContests('title', searchParams.get('q'), true, page).data);
                    /*fetchContests('title', searchParams.get('q'), true, page)
                        .then(result => {
                            apiData.set(
                                {
                                'total_count': result.total_count,
                                'limit': result.limit,
                                'offset': result.offset,
                                }
                            );
                            return result.data
                        })
                        .then(set)*/
                    respondToPromise('title', searchParams.get('q'), set);
                    resolve()
                }, delay)
            })
        } else if (searchParams.get('address') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //fetchContests('address', searchParams.get('address'), true, page).then(set);
                    respondToPromise('address', searchParams.get('address'), set);
                    resolve()
                }, delay)
            })
        } else if (searchParams.get('latitude') !== null && searchParams.get('longitude') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //fetchContests('coordinates', searchParams.get('latitude') + ',' + searchParams.get('longitude'), true, page).then(set);
                    respondToPromise('coordinates', searchParams.get('latitude') + ',' + searchParams.get('longitude'), set);
                    resolve()
                }, delay)
            })
        }
    } else if ($location.startsWith("/contests/")) {
        if (searchParams.get('scope') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //fetchContests('scope', searchParams.get('scope'), true, page).then(set);
                    respondToPromise('scope', searchParams.get('scope'), set);
                    resolve()
                }, delay)
            })
        } else if (searchParams.get('group') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //fetchContests('results_group', searchParams.get('group'), true, page).then(set);
                    respondToPromise('results_group', searchParams.get('group'), set);
                    resolve()
                }, delay)
            })
        }
    } else if ($location.startsWith("/contest/") && searchParams.get('id') !== null) {
        new Promise((resolve) => {
            setTimeout(() => {
                //fetchContests('contest_id', searchParams.get('id'), true, page).then(set);
                respondToPromise('contest_id', searchParams.get('id'), set);
                resolve()
            }, delay)
        })
    } else if ($location === "/" && ! searchParams.get('q')) {
        new Promise((resolve) => {
            setTimeout(() => {
                //fetchContests('contest_ids', dashboard, true, page).then(set);
                respondToPromise('contest_ids', dashboard, set);
                resolve()
            }, delay)
        })
    }
    pollInfo.set({ lastModified: new Date() });
}

// store and refresh displayed results
export const electionData = writable([], () => {
    fetchAndSetElection();
    const interval = setInterval(() => {
        fetchAndSetElection();
    }, fetchInterval);
    //  If you return a function from the callback, it will be called when
    //  a) the callback runs again, or b) the last subscriber unsubscribes.
    return () => {
        clearInterval(interval);
    };
})

function fetchAndSetElection() {
    const fetchedElection = fetchElection();
    electionData.set(fetchedElection);
    pollInfo.set({ lastModified: new Date() });
}
