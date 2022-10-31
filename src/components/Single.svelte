<script>
    // routing
    import {push, location, querystring} from 'svelte-spa-router';

    export let promise;

    // data
    import { resultStore } from './../stores.js';

    // set the contest
    let contest_id = '';
    let contest;
    let searchParams = new URLSearchParams($querystring);
    /*import { onMount } from 'svelte';
    onMount(() => {
        if ( $location.startsWith("/contest/") && searchParams.get('id') !== null) {
            contest_id = searchParams.get('id');
            contest = getKeyByValue($resultStore, contest_id);
            //console.log('contest id is ' + contest.id);
        }
    });*/

    function getKeyByValue(object, value) {
        console.log(object);
        return Object.keys(object).find(id => object['id'] === value);
    }

    function getContest(object, value) {
        return Object.keys(object).find(id => object['id'] === value);
    }

</script>

{#await promise}
	<p>Loading contests</p>
{:then}
{#key $resultStore}
    {getContest($resultStore, contest_id)}
{/key}
<!--<Advertisement adCodeId="x100" />-->
{:catch error}
    <p>Something went wrong: {error.message}</p>
{/await}
