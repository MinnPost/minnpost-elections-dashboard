<style>
    .o-wrapper-contests-navigation {
        border-top: 2px solid #d6d6da;
        margin: 0 0 0.75em 0;
        position: sticky;
        top: 0;
        background: #fff;
    }
    :global(.admin-bar .o-wrapper-contests-navigation) {
        top: 32px !important;
    }
    .m-contests, .m-menu-contest-groups, .m-menu-contest-groups ul {
        width: 100%;
    }
    .m-menu-contest-groups ul {
        justify-content: space-around;
    }
    :global(a.active) {
        color: #135b7e;
        font-weight: 700;
    }
</style>

<script>
    // routing
    import {link} from 'svelte-spa-router';
    import active from 'svelte-spa-router/active'
</script>
<div class="o-wrapper o-wrapper-sub-navigation o-wrapper-topics-navigation o-wrapper-contests-navigation">
    <a class="a-subnav-label a-topics-label a-contests-label" href="/" use:link>Featured Election Groups</a>
    <div class="m-sub-navigation m-topics m-contests">
        <nav class="m-subnav-navigation m-topics-navigation m-menu-contest-groups">
            <ul>
                <li><a href="/" use:link use:active>Dashboard</a></li>
                <li><a href="/contests/?scope=state" use:link use:active={{path: '*/?scope=state'}}>Statewide</a></li>
                <li><a href="/contests/?scope=us_house" use:link use:active={{path: '*/?scope=us_house'}}>U.S. House</a></li>
                <li><a href="/contests/?scope=state_senate" use:link use:active={{path: '*/?scope=state_senate'}}>State Senate</a></li>
                <li><a href="/contests/?scope=state_house" use:link use:active={{path: '*/?scope=state_house'}}>State House</a></li>
                <li><a href="/search/?q=hennepin" use:link use:active use:active={{path: '*/?q=hennepin'}}>Hennepin County</a></li>
                <!--<li><a href="/contests/?scope=school" use:link use:active={{className: 'active'}}>School Districts</a></li>
                <li><a href="/contests/?scope=municipal" use:link use:active={{className: 'active'}}>Municipal</a></li>
                <li><a href="/contests/?scope=county" use:link use:active={{className: 'active'}}>County</a></li>-->
            </ul>
        </nav>
    </div>
</div>
