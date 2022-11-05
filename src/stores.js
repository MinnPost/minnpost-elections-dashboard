import { writable, derived } from 'svelte/store';
import { dashboard } from './data/dashboard.js';
import { fetchElection, fetchContests } from "./data/api.js";
import {location, querystring} from 'svelte-spa-router';

let delay = 0;
let fetchInterval = 50000;

// when the page itself was last modified
export const pollInfo = writable({
    lastModified: new Date()
});

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
function respondToPromise(key, values, page, set) {
    fetchContests(key, values, true, page)
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
        .then(set)
}

// routing for displayed results
function fetchAndSet($location, $querystring, set) {
    const searchParams = new URLSearchParams($querystring);
    let page = 0;
    if (searchParams.get('page') !== null) {
        page = searchParams.get('page');
    }
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
                    respondToPromise('title', searchParams.get('q'), page, set);
                    resolve()
                }, delay)
            })
        } else if (searchParams.get('address') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //fetchContests('address', searchParams.get('address'), true, page).then(set);
                    respondToPromise('address', searchParams.get('address'), page, set);
                    resolve()
                }, delay)
            })
        } else if (searchParams.get('latitude') !== null && searchParams.get('longitude') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //fetchContests('coordinates', searchParams.get('latitude') + ',' + searchParams.get('longitude'), true, page).then(set);
                    respondToPromise('coordinates', searchParams.get('latitude') + ',' + searchParams.get('longitude'), page, set);
                    resolve()
                }, delay)
            })
        }
    } else if ($location.startsWith("/contests/")) {
        if (searchParams.get('scope') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //fetchContests('scope', searchParams.get('scope'), true, page).then(set);
                    respondToPromise('scope', searchParams.get('scope'), page, set);
                    resolve()
                }, delay)
            })
        } else if (searchParams.get('group') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    //fetchContests('results_group', searchParams.get('group'), true, page).then(set);
                    respondToPromise('results_group', searchParams.get('group'), page, set);
                    resolve()
                }, delay)
            })
        }
    } else if ($location.startsWith("/contest/") && searchParams.get('id') !== null) {
        new Promise((resolve) => {
            setTimeout(() => {
                //fetchContests('contest_id', searchParams.get('id'), true, page).then(set);
                respondToPromise('contest_id', searchParams.get('id'), page, set);
                resolve()
            }, delay)
        })
    } else if ($location === "/" && ! searchParams.get('q')) {
        new Promise((resolve) => {
            setTimeout(() => {
                //fetchContests('contest_ids', dashboard, true, page).then(set);
                respondToPromise('contest_ids', dashboard, page, set);
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
