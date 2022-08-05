<script>
	import { Match } from 'svelte-store-router'
	import { route, contests } from './stores.js';
	import Results from "./Results.svelte";


</script>

<div class="election-results">
	<header class="m-dashboard-header">
		<h2 class="a-election-status">election date primary or general election results. Last updated on when it was updated</h2>
	</header>

	<div>
		<ol>
			<li>search form</li>
			<li>suggested searches</li>
		</ol>
	</div>

	<button on:click={() => $route.path = '/'}>dashboard</button>
	<button on:click={() => $route.path = '/search'}>search for a contest</button>

	<Match route={$route} pattern="/">
		<Results promise="{contests.init()}" contests="$contests"/>
	</Match>
	<Match route={$route} pattern="/search">
		<Results promise="{contests.update()}" contests="$contests"/>
	</Match>
	<Match route={$route} pattern="/contests/:id" let:params={{ id }}>
		Contest {id} profile
	</Match>

	<ol>
		<li>show results
			<ul>
				<li>list of current result races</li>
			</ul>
			<ul>
				<li>table of individual race's results</li>
				<li>map</li>
				<li>permalink to that race?</li>
			</ul>
		</li>
	</ol>

</div>