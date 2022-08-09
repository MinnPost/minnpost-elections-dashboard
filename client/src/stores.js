import { writable, derived } from 'svelte/store';
import { dashboard } from './data/dashboard.js';
import { fetchMetadata, fetchContests } from "./data/api.js";
import { path, query, pattern } from 'svelte-pathfinder';

let delay = 300;

// routing
export const resultStore = derived([pattern, query], ([$pattern, $query], set) => {
    if ($pattern('/search/') && $query.params.q) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('title', $query.params.q)
                    .then(set);
                resolve()
            }, delay)
        })
    } else {
        new Promise((resolve) => {
            setTimeout(() => {
                fetchContests('contest_ids', dashboard)
                    .then(set);
                resolve()
            }, delay)
        })
    }
}, []);

// data
export const electionMeta = createMetadata();
function createMetadata() {
	const {subscribe, set, update} = writable([]);
	return {
		subscribe,
		fetchAll: () => {
			const fetchedMetadata = fetchMetadata();
			set(fetchedMetadata);
		}
	}
}
