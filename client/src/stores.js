import { readable, writable, derived } from 'svelte/store';
import { dashboard } from './data/dashboard.js';
import { fetchElection, fetchContests } from "./data/api.js";
import { path, query, pattern } from 'svelte-pathfinder';

let delay = 300;
let fetchInterval = 50000;

// store and refresh displayed results
export const resultStore = derived([pattern, query], ([$pattern, $query], set) => {
    fetchAndSet($pattern, $query, set);
    const interval = setInterval(() => {
        fetchAndSet($pattern, $query, set)
    }, fetchInterval);
    //  If you return a function from the callback, it will be called when
    //  a) the callback runs again, or b) the last subscriber unsubscribes.
    return () => {
        clearInterval(interval);
    };
}, []);

// routing for displayed results
function fetchAndSet($pattern, $query, set) {
    if ($pattern('/search/') && $query.params.q) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('title', $query.params.q, true).then(set);
                resolve()
            }, delay)
        })
    } else if ($pattern('/contests/')) {
        if ($query.params.scope) {
            new Promise((resolve) => {
                setTimeout(() => {
                    fetchContests('scope', $query.params.scope, true).then(set);
                    resolve()
                }, delay)
            })
        } else if ($query.params.group) {
            new Promise((resolve) => {
                setTimeout(() => {
                    fetchContests('results_group', $query.params.group, true).then(set);
                    resolve()
                }, delay)
            })
        }
    } else if ($pattern('/') && !$query.params.q) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('contest_ids', dashboard, true).then(set);
                resolve({name: "testing"})
            }, delay)
        })
    }
}

// election data
export const electionData = createElectionData();
function createElectionData() {
	const {subscribe, set, update} = writable([]);
	return {
		subscribe,
		fetchAll: () => {
            const fetchedElection = fetchElection();
            set(fetchedElection);
            const interval = setInterval(() => {
                fetchElection();
                set(fetchedElection);
            }, fetchInterval);
            //  If you return a function from the callback, it will be called when
            //  a) the callback runs again, or b) the last subscriber unsubscribes.
            return () => {
                clearInterval(interval);
            };
		}
	}
}
