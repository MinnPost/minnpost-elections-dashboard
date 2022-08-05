<script>
	import { Match } from 'svelte-store-router'
	import { route } from './stores.js';
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

	<button on:click={() => $route.path = '/'}>home page</button>
	<button on:click={() => $route.path = '/users'}>user list</button>

	<Match route={$route} pattern="/">
		base
	</Match>
	<Match route={$route} pattern="/users">
		User list
	</Match>
	<Match route={$route} pattern="/users/:id" let:params={{ id }}>
		User {id} profile
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