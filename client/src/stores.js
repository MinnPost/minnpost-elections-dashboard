import { createRouteStore } from 'svelte-store-router';
import { writable } from 'svelte/store';
import { dashboard } from './dashboard.js';
import { fetchContests } from "./api.js";

let delay = 150;

// routing
export const route = createRouteStore({
    base: '/elections/2022/08/2022-election-result-dashboard/',
    delay: 0,
    queryClean: true,
    fragmentClean: true
})

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
