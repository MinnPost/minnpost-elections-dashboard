import { writable, derived } from 'svelte/store';
import { dashboard } from './dashboard.js';
import { fetchContests } from "./api.js";
import { path, query, pattern } from 'svelte-pathfinder';

let delay = 300;
let apiRoot = "http://0.0.0.0:5000/api/";

// routing
export const resultStore = derived(pattern, ($pattern, set) => {
    if ($pattern('/search/')) {
        new Promise((resolve) => {
            setTimeout(() => {
                fetch( `${apiRoot}contests/?title=governor` )
                    .then(res => res.json())
                    .then(set);
                resolve()
            }, delay)
        })
    } else {
        set(dashboard);
    }
}, []);

// contests
export const contests = createContestsStore();
export function createContestsStore() {
	const { subscribe, update, set } = writable([])

	return {
		subscribe,
		set: (newList) => {
			return new Promise((resolve) => {
				 setTimeout(() => {
					set(newList)
					resolve()
				}, delay)
			})
		},
		update: () => {
			return new Promise((resolve) => {
				 setTimeout(() => {
					update(list => [...list,
						{ title: `contest${list.length + 1}` }
					])
					resolve()
				}, delay)
			})
		},
		init: () => {
			return new Promise((resolve) => {
				 setTimeout(() => {
					set(dashboard)
					resolve()
				}, delay)
			})
		}
	}
}
