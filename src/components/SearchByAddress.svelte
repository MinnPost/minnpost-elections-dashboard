<style>
    .search-field {
        width: 100%;
        height: 2.25em;
        max-width: 100%;
        font: inherit;
        padding: 5px 11px;
    }
    .input-clearable {
        position: relative;
        width: 100%;
        max-width: 100%;
    }
    .address-clear-button {
        cursor: pointer;
        display: none;
        text-align: center;
        position: absolute;
        right: 0.1em;
        padding: 0.3em 0.6em;
        top: 50%;
        -webkit-transform: translateY(-50%);
        -ms-transform: translateY(-50%);
        transform: translateY(-50%);
        z-index: 4;
    }
    form {
        border-bottom: 1px solid #5e6e76;
        padding: 0 1.5em;
        margin: 0 auto 1.5em auto;
        width: 83.6842105263%;
    }
    fieldset {
        border: 0;
    }
    @media screen and (min-width: 30em) {
        form {
            width: 75.5172413793%;
        }
    }
    @media screen and (min-width: 50em) {
        form {
            width: 58.7179487179%;
        }
    }
    @media screen and (min-width: 60em) {
        form {
            width: 59.1525423729%;
        }
    }
    @media screen and (min-width: 70em) {
        form {
            width: 75.5172413793%;
        }
    }
</style>

<script>
    // routing
    import {push, location, querystring} from 'svelte-spa-router';

    // form behavior
    let searchTerm = "";
    let searchParams = new URLSearchParams($querystring);
    
    let searchSubmit = function(event, value) {
        if ( typeof value === 'object' ) {
            value = value.address;
        }
        if (value === '') {
            const formData = new FormData(event.target);
            let data = [];
            for (let field of formData) {
                const [key, value] = field;
                data[key] = value;
            }
            if (data['address'] ) {
                value = data['address'];
            }
        }
        if ( value !== '') {
            push('/search/?address=' + value);
        }
        searchTerm = value;
    }

    let addressClearButton;
    let showSearchForm;
    import { onMount } from 'svelte';
    onMount(() => {
        if ( ! $location.startsWith("/search/") || searchParams.get('address') === null) {
            searchTerm = "";
        }
        if ( $location.startsWith("/search/") && searchParams.get('address') !== null) {
            searchTerm = searchParams.get('address');
        }
        addressClearButton = document.querySelector('.address-clear-button');
        addressClearButton.addEventListener('click', resetAddressField);
        showSearchForm = document.querySelector('.a-show-search-form');
        showSearchForm.addEventListener('click', _showSearchForm);
    });

    function resetAddressField() {
        searchTerm = "";
        _toggleClearButton(false);
        push('/');
    }

    function _toggleClearButton(show) {
        addressClearButton.setAttribute(
        'style',
        'display:' + (show ? 'block' : 'none')
        );
    }

    function _showSearchForm(e) {
        e.preventDefault();
        document.querySelector('.m-form-search-contest').setAttribute(
        'style',
        'display:block'
        );
        document.querySelector('.m-form-search-contest-by-address').setAttribute(
        'style',
        'display:none'
        );
    }

    const onInput = (event) => {
        //console.log(event);
        if (event.target.value) {
            addressClearButton.setAttribute(
            'style',
            'display:block'
            );
        } else {
            addressClearButton.setAttribute(
            'style',
            'display:none'
            );
        }
    };

    let Geolocate;
	onMount(async () => {
		Geolocate = (await import('./Geolocate.svelte')).default;
	});

</script>

<div class="m-form m-form-search m-form-search-contest m-form-search-contest-by-address">
        <form on:submit|preventDefault={() => searchSubmit(event, searchTerm)}>
            <fieldset>
                <label class="a-search-label screen-reader-text" for="q">Search for a contest by address</label>
                <div class="a-input-with-button a-button-sentence">
                    <div class="input-clearable">
                    <input type="search" name="address"
                        bind:value={searchTerm}
                        on:keydown={onInput}
                        class="search-field"
                        placeholder="Search for a contest by address"
                    >
                    <span class="autocomplete-clear-button address-clear-button">✖</span>
                    </div>
                    <button type="submit" class="search-submit">Search</button>
                </div>
                <p><small>To find results, <a href="#" class="a-show-search-form">search for a contest</a> or <svelte:component this="{Geolocate}"/></small></p>
            </fieldset>
        </form>
</div>
