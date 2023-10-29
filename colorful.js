// Customisation and Thresholds
const SCALE = 8.6; // downscale the image for quicker performence. Larger means faster.
const COLOR_COUNT = 4; // max colours in a single blob.
const DISTINCT_THRESHOLD = 100; // What distance (in colour-space) between two colours makes them distinct from each other?
const GREYSCALE_READABILITY = 120; // How dark need a background be, to necessitate white text atop it? Smaller means less contrast.
const IGNORE_FILLERS = 2; // Ignore the whites and blacks of an image. Larger means ignore more colours.
const SIGNIFICANT_PERCENT = 0.02; // How much should a colour appear in an image, so that it can be considered one of its colours? Lower means less occurrences.

function taintParent(x) {
    try {
        x.crossOrigin = "Anonymous"; // workaround for _some_ images whose crosssite policy is not good.
    } catch (error) {
        console.error(error);
        x.src = "https://picsum.photos/210";
        setTimeout(taintParent, 200, this);
        return;
    }

    // create a virtual canvas and paint the image onto it.
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = x.width / SCALE;
    canvas.height = x.height / SCALE;
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
    let factorAccumulator = 1;
    // Here one can also adjust the constants.
    if (Math.abs(hue1 - hue2) < 20) factorAccumulator *= 0.5;
    if (Math.abs(hue1 - hue2) > 200) factorAccumulator *= 1.5;
    if (Math.abs(bright1 - bright2) > 200) factorAccumulator *= 1.1;
    return euclideanDistance(color1, color2) * factorAccumulator;
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

