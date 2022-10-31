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

// routing for displayed results
function fetchAndSet($location, $querystring, set) {
    const searchParams = new URLSearchParams($querystring);
    if ($location.startsWith("/search/") && searchParams.get('q') !== null) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('title', searchParams.get('q'), true).then(set);
                resolve()
            }, delay)
        })
    } else if ($location.startsWith("/contests/")) {
        if (searchParams.get('scope') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    fetchContests('scope', searchParams.get('scope'), true).then(set);
                    resolve()
                }, delay)
            })
        } else if (searchParams.get('group') !== null) {
            new Promise((resolve) => {
                setTimeout(() => {
                    fetchContests('results_group', searchParams.get('group'), true).then(set);
                    resolve()
                }, delay)
            })
        }
    } else if ($location.startsWith("/contest/") && searchParams.get('id') !== null) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('contest_id', searchParams.get('id'), true).then(set);
                resolve()
            }, delay)
        })
    } else if ($location === "/" && ! searchParams.get('q')) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('contest_ids', dashboard, true).then(set);
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
