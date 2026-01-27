
const url = 'https://link.deezer.com/s/32fZhTnUgqYvRuBTeinx3';

async function test() {
    console.log(`Testing URL: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'manual'
        });

        console.log(`Status: ${response.status}`);
        console.log(`Headers:`, response.headers);

        const location = response.headers.get('location');
        console.log(`Location Header: ${location}`);

        if (location) {
            const regex = /playlist\/(\d+)/;
            const match = location.match(regex);
            console.log(`Regex match on location:`, match);
        } else {
            console.log("No location header found.");
            // Maybe it follows automatically? Let's check 'url' property if it changed (but fetch manual shouldn't)
        }

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

test();
