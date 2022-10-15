// set the races
let dashboardRaces = [
    {
        id: 'id-MN---3-0123'
    },
    {
        id: 'id-MN---7-0127'
    },
    {
        id: "id-MN---3-0106"
    },
    {
        id: "id-MN----0335"
    },
    {
        id: "id-MN----0332"
    },
    {
        id: "id-MN---8-0111"
    },
    {
        id: "id-MN---4-0107"
    },
    {
        id: "id-MN---5-0108"
    },
    {
        id: "id-MN---6-0109"
    },
    {
        id: "id-MN----0333"
    },
    {
        id: "id-MN---2-0105"
    },
    {
        id: "id-MN---7-0110"
    },
    {
        id: "id-MN----0331"
    },
    {
        id: 'id-MN---43000-1132'
    },
    {
        id: 'id-MN---43000-1133'
    },
    {
        id: 'id-MN---58000-1131'
    },
    {
        id: 'id-MN---43000-2121'
    },
    {
        id: 'id-MN---43000-2181'
    },
    {
        id: 'id-MN---43000-2191'
    }
];

// only use the ids. this might be unnecessary if we restructure.
export let dashboard = dashboardRaces.map(function (el) { return el.id; });
