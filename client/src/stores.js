import { createRouteStore } from 'svelte-store-router';

export const route = createRouteStore({
    //base: '/elections/2022/08/2022-election-result-dashboard/',
    delay: 300,
    queryClean: true,
    fragmentClean: true
})
