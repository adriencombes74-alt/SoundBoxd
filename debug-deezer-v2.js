
const url = 'https://link.deezer.com/s/32fZhTnUgqYvRuBTeinx3';

async function test() {
    console.log(`Testing URL: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'manual'
        });

        let location = response.headers.get('location');
        console.log(`Raw Location: ${location}`);

        if (location) {
            // Try decoding
            const decoded = decodeURIComponent(location);
            console.log(`Decoded Location: ${decoded}`);

            const regex = /playlist\/(\d+)/;
            const match = decoded.match(regex);
            console.log(`Regex match on decoded:`, match);
        }

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

test();
