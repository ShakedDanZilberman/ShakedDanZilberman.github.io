// Customisation and Thresholds
const SCALE = 8; // downscale the image for quicker performence. Larger means faster.
const COLOR_COUNT = 4; // max colours in a single blob.
const DISTINCT_THRESHOLD = 100; // What distance (in colour-space) between two colours makes them distinct from each other?
const GREYSCALE_READABILITY = 120; // How dark need a background be, to necessitate white text atop it? Smaller means less contrast.
const IGNORE_FILLERS = 2; // Ignore the whites and blacks of an image. Larger means ignore more colours.
const SIGNIFICANT_PERCENT = 0.015; // How much should a colour appear in an image, so that it can be considered one of its colours? Lower means less occurrences.

String.prototype.capitalise = function () {
    return this.split(" ").map(function (ele) { return ele[0].toUpperCase() + ele.slice(1).toLowerCase(); }).join(" ");
};

var addresses, images;
const name = window.location.hash;

if (name != '') {
    var parts = name.match(/[A-Z][a-z]+|[0-9]+/g);
    var nameParts = [];
    var zeros = '';
    for (let part of parts) {
        if (part[0] == '0') {
            zeros += part;
        } else {
            nameParts.push(part.toLowerCase());
        }
    }
    addresses = [
        nameParts.join('.') + '.' + zeros + '45@gmail.com',
        nameParts.join('.') + "@mail.huji.ac.il"
    ];
    images = [
        "https://upload.wikimedia.org/wikipedia/commons/e/ec/%D7%A1%D7%9E%D7%9C_%D7%AA%D7%9C%D7%A4%D7%99%D7%95%D7%AA.JPG",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Hebrew_University_Logo.svg/130px-Hebrew_University_Logo.svg.png"
    ];
} else {
    addresses = ["first_person@gmail.com", "second_person@gmail.com", "third_person@gmail.com", "forth_person@gmail.com"]
    images = [
        "https://picsum.photos/200",
        "https://picsum.photos/201",
        "https://picsum.photos/202",
        "https://picsum.photos/203"
    ];
}

const title = document.getElementById('title');
const img = document.getElementById('favicon');

handle_title();

const length = addresses.length;
const container = document.getElementById('container');
container.innerHTML = "";

for (let i = 0; i < length; i++) {
    container.innerHTML += `
        <div class="blob" onclick="clicked(${i});">
            <h1>User <i>${i}</i></h1>
            <img src="${images[i]}" alt="" onload="setTimeout(taintParent, 200, this)">
            <h2>${addresses[i]}</h2>
        </div>
    `;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clicked(i) {
    if (malfromed_link()) return;

    var result = window.location.search.replace(/0/, i);
    if (result.charAt(0) == '?') result = result.substring(1);
    console.log(result);
    window.location.assign(result);
}

function openAll() {
    if (malfromed_link()) return;

    function atindex(i) {
        var result = window.location.search.replace(/0/, i);
        if (result.charAt(0) == '?') result = result.substring(1);
        console.log(result);
        return result
    }

    for (var i = length - 2; i >= 0; i--) {
        openInNewTab(atindex(i));
    }

    window.location.replace(atindex(length - 1));

}

function openInNewTab(href) {
    Object.assign(document.createElement('a'), {
        target: '_blank',
        rel: 'noopener noreferrer',
        href: href,
    }).click();
}

function handle_title() {
    var a = window.location.search.substring(1); // removes '?'
    // img.src = "https://s2.googleusercontent.com/s2/favicons?sz=64&domain_url=" + a;
    img.src = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${a}&size=64`;
    a = a.split('/')[2]; // returns main part (domain name)
    a = a.split('.'); // splits to subdomain, domain, TLD
    a.pop(); // removes TLD
    a.reverse(); // reverses array, so that the host comes before the subdomain
    title.innerText = a.join(' '); // The h3 is something like "Google Calendar".

    // Google Classroom requires login to display the correct icon, so here's a workaround:
    if (title.innerText.toLowerCase() == "Google Classroom".toLowerCase()) {
        img.src = "https://ssl.gstatic.com/classroom/ic_product_classroom_32.png";
    }
    document.getElementsByTagName('head')[0].innerHTML += `<link rel="icon" href="${img.src}">`; // favicon of shortcut matches dest site.

    document.title = a.join(' ').capitalise() + " Account Selector"; // The title is something like "Google Calendar Account Selector"

    // taintParent(img); // won't work because Google isn't permissible enough on its images
}

function malfromed_link() {
    if (window.location.search == "") {
        console.error("Empty query");
        window.alert("Malformed link...");
        return true;
    }
    else if (!window.location.search.includes('0')) {
        console.error("0-less query"); // query must contain '0' so an account can be chosen.
        window.alert("Malformed link...");
        return true;
    }
    return false;
}

function taintParent(x) {
    x.crossOrigin = "Anonymous"; // workaround for _some_ images whose crosssite policy is not good.

    // create a virtual canvas and paint the image onto it.
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = x.width;
    canvas.height = x.height;
    ctx.drawImage(x, 0, 0, x.width / SCALE, x.height / SCALE);
    
    // read the image data from the canvas.
    if (x.width == 0) return;
    const imageData = ctx.getImageData(0, 0, x.width / SCALE, x.height / SCALE);
    const data = imageData.data;
    const avg = getAvgColor(data); // algorithm that picks the average colour but more saturated
    x.parentElement.style.backgroundColor = rgbify(avg);
    
    let distinctColors = extractDistinctColors(data, avg, COLOR_COUNT, DISTINCT_THRESHOLD); // extracts up to 4 distinct colours from the image.
    
    try {
        // if the last colour is almost black, make the text on it white.
        if (euclideanDistance(distinctColors[distinctColors.length - 1], [0, 0, 0]) < GREYSCALE_READABILITY) {
            x.parentElement.children[0].style.color = 'white';
        } else {
            x.parentElement.children[0].style.color = 'black';
        }

        // if the first colour is almost black, make the text on it white.
        if (euclideanDistance(distinctColors[0], [0, 0, 0]) < GREYSCALE_READABILITY) {
            x.parentElement.children[2].style.color = 'white';
        } else {
            x.parentElement.children[2].style.color = 'black';
        }
    } catch (error) {
        console.error(error)
    }
    
    // create a valid CSS linear gradient.
    distinctColors = distinctColors.map(rgbify);
    let gradient = "linear-gradient(0deg, ";
    for (let i = 0; i < distinctColors.length; i++) {
        gradient += distinctColors[i];
        gradient += " ";
        gradient += Math.floor(i * 100 / distinctColors.length);
        gradient += "%, ";
        gradient += distinctColors[i];
        gradient += " ";
        gradient += Math.floor((i+1) * 100 / distinctColors.length);
        gradient += "%, ";
    }
    gradient = gradient.substring(0, gradient.length - 2);
    gradient += ')';

    // use the gradient as the background of the parent of the image.
    x.parentElement.style.background = gradient;
}

function rgbify(color) {
    const [r, g, b] = color;
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
}

function getAvgColor(data) {
    // sums up all the R, G, B values, unless they are brighter than 250 or dimmer than 5,
    // divides by the count (a.k.a taking the average).
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;

    for (let i = 0; i < data.length; i += 4) {
        let [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        let bright = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (bright > 255 - IGNORE_FILLERS || bright < IGNORE_FILLERS) continue;
        totalR += r;
        totalG += g;
        totalB += b;
    }

    const pixelCount = data.length / 4;
    let r = totalR / pixelCount;
    let g = totalG / pixelCount;
    let b = totalB / pixelCount;

    return [r, g, b];
}

function euclideanDistance(color1, color2) {
    // d = √(Δr² + Δg² + Δb²)
    const [r1, g1, b1] = color1;
    const [r2, g2, b2] = color2;
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function hue(red, green, blue) {
    let min = Math.min(Math.min(red, green), blue);
    let max = Math.max(Math.max(red, green), blue);

    if (min == max) {
        return 0;
    }

    let hue = 0;
    if (max == red) {
        hue = (green - blue) / (max - min);
    } else if (max == green) {
        hue = 2 + (blue - red) / (max - min);
    } else {
        hue = 4 + (red - green) / (max - min);
    }

    hue = hue * 60;
    if (hue < 0) hue = hue + 360;

    return Math.round(hue);
}

function colorDistance(color1, color2) {
    const [r1, g1, b1] = color1;
    const [r2, g2, b2] = color2;
    const hue1 = hue(r1, g1, b1);
    const hue2 = hue(r2, g2, b2);
    const bright1 = 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
    const bright2 = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
    let factor = 1;
    // Here one can also adjust the constants.
    if (Math.abs(hue1 - hue2) < 20) factor *= 0.5;
    if (Math.abs(hue1 - hue2) > 200) factor *= 1.5;
    if (Math.abs(bright1 - bright2) > 200) factor *= 1.1;
    return euclideanDistance(color1, color2) * factor;
}

function extractDistinctColors(imageData, avg, N, threshold) {
    const pixelCount = imageData.length / 4; // Assuming 4 bytes per pixel (RGBA)
    const countThreshold = SIGNIFICANT_PERCENT * pixelCount;

    // 1) Unique-ify the data with a threshold.
    const uniques = [];

    for (let i = 0; i < pixelCount; i++) {
        const startIndex = i * 4; // Each pixel has 4 bytes (RGBA)
        const rgb = [imageData[startIndex], imageData[startIndex + 1], imageData[startIndex + 2]];

        let isUnique = true;

        for (let j = 0; j < uniques.length; j++) {
            let existingColor = uniques[j].color;
            if (colorDistance(rgb, existingColor) < threshold) {
                isUnique = false;
                if (colorDistance(avg, existingColor) < colorDistance(avg, rgb)) {
                    uniques[j].color = rgb;
                }
                uniques[j].count++;
                break;
            }
        }

        if (isUnique) {
            uniques.push({color: rgb, count: 1});
        }
    }

    // 2) Sort by distance from avg.
    const sortedColors = uniques
    .filter(({ count }) => count >= countThreshold)
    .map(({ color, count }) => ({ color, count, distance: colorDistance(color, avg) }))
    .sort((a, b) => b.distance - a.distance);

    // 3) Extract the first N colors.
    return sortedColors.slice(0, N).map(item => item.color);
}