// Customisation and Thresholds
const SCALE = 10; // downscale the image for quicker performence. Larger means faster.
const COLOR_COUNT = 4; // max colours in a single blob.
const DISTINCT_THRESHOLD = 110; // What distance (in colour-space) between two colours makes them distinct from each other?
const GREYSCALE_READABILITY = 150; // How dark need a background be, to necessitate white text atop it? Smaller means less contrast.
const IGNORE_FILLERS = 2; // Ignore the whites and blacks of an image. Larger means ignore more colours.
const SIGNIFICANT_PERCENT = 0.1; // How much should a colour appear in an image, so that it can be considered one of its colours? Lower means less occurrences.
// NOTE: In the new DS algorithm for colour extraction, most parameters are no longer used. The used parameters are: SCALE, COLOR_COUNT, GREYSCALE_READABILITY only.

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

    let distinctColors = extractDistinctColors(data, COLOR_COUNT); // extracts up to 4 distinct colours from the image.

    // remove all occurrences of [0, 0, 0]
    distinctColors = distinctColors.filter(color => euclideanDistance(color, [0, 0, 0]) > 10);

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
    /* converts an [R, G, B] array into a CSS rgb() string.

    E.g. [255, 0, 0] -> "rgb(255, 0, 0)"

    */
    const [r, g, b] = color;
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
}

function getAvgColor(data) {
    // sums up all the R, G, B values, unless they are brighter than 250 or dimmer than 5,
    // divides by the count (a.k.a taking the average).
    // Ignores alpha channel.
    // data is of the form [R, G, B, A, R, G, B, A, ...]
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
    // Calculates the hue of an RGB color.
    // e.g. hue(255, 0, 0) = 0 (red)
    //      hue(0, 255, 0) = 120 (green)
    //      hue(0, 0, 255) = 240 (blue)
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
    if (Math.abs(bright1 - bright2) > 150) factorAccumulator *= 1.1;
    return euclideanDistance(color1, color2) * factorAccumulator;
}

function extractDistinctColorsOld(imageData, avg, N, threshold) {
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

    console.log(sortedColors)

    // 3) Extract the first N colors.
    return sortedColors.slice(0, N).map(item => item.color);
}


function extractDistinctColors(imageData, N) {
    // imageData is of the form [R, G, B, A, R, G, B, A, ...]
    // N is the number of distinct colors to extract.

    // The algorithm implemented here works like this:
    // Assign a "random" group number (0 to N-1) to each pixel.
    // Iteratively,
    //     For each group, find the average color of the pixels assigned to that group.
    //     Reassign each pixel to the group whose average color is closest to it.

    const pixelCount = imageData.length / 4; // Assuming RGBA
    let pixels = [];

    // Step 1: Initialize pixels with random group assignments
    // Not actually random, but if there are 4 groups, then the top 25% go to group 0, next 25% to group 1, etc.
    // This is done to ensure reproducibility, and because images often have spatial coherence, so this helps for faster convergence.
    for (let i = 0; i < pixelCount; i++) {
        const startIndex = i * 4;
        const rgb = [imageData[startIndex], imageData[startIndex + 1], imageData[startIndex + 2]];
        const group = Math.floor((i / pixelCount) * N);
        pixels.push({ color: rgb, group: group });
    }

    // Step 2: Iteratively refine group assignments
    const MAX_ITERATIONS = 10;
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        const groupSums = Array.from({ length: N }, () => [0, 0, 0]);
        const groupCounts = Array.from({ length: N }, () => 0);
        // Calculate sums and counts for each group
        for (const pixel of pixels) {
            const group = pixel.group;
            groupSums[group][0] += pixel.color[0];
            groupSums[group][1] += pixel.color[1];
            groupSums[group][2] += pixel.color[2];
            groupCounts[group]++;
        }

        // Calculate new group averages
        const newGroupAssignments = pixels.map(pixel => {
            const group = pixel.group;
            const count = groupCounts[group];
            if (count === 0) return pixel;

            const avgColor = [
                Math.floor(groupSums[group][0] / count),
                Math.floor(groupSums[group][1] / count),
                Math.floor(groupSums[group][2] / count)
            ];

            // Find the closest group to the pixel's color
            const closestGroup = findClosestGroup(pixel.color, groupSums, groupCounts);
            return { ...pixel, group: closestGroup };
        });

        // If no pixels changed groups, we can stop early
        const groupsChanged = newGroupAssignments.some((pixel, i) => pixel.group !== pixels[i].group);
        if (!groupsChanged) break;

        pixels = newGroupAssignments;
    }

    // Step 3: Extract the final group colors
    const finalColors = Array.from({ length: N }, () => [0, 0, 0]);
    const finalCounts = Array.from({ length: N }, () => 0);
    for (const pixel of pixels) {
        const group = pixel.group;
        finalColors[group][0] += pixel.color[0];
        finalColors[group][1] += pixel.color[1];
        finalColors[group][2] += pixel.color[2];
        finalCounts[group]++;
    }

    // Average the final colors
    for (let i = 0; i < N; i++) {
        if (finalCounts[i] > 0) {
            finalColors[i][0] = Math.floor(finalColors[i][0] / finalCounts[i]);
            finalColors[i][1] = Math.floor(finalColors[i][1] / finalCounts[i]);
            finalColors[i][2] = Math.floor(finalColors[i][2] / finalCounts[i]);
        }
    }

    // Return the final colors
    return finalColors;
}

function findClosestGroup(color, groupSums, groupCounts) {
    let closestGroup = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < groupSums.length; i++) {
        if (groupCounts[i] === 0) continue;

        const avgColor = [
            Math.floor(groupSums[i][0] / groupCounts[i]),
            Math.floor(groupSums[i][1] / groupCounts[i]),
            Math.floor(groupSums[i][2] / groupCounts[i])
        ];

        const distance = colorDistance(color, avgColor);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestGroup = i;
        }
    }

    return closestGroup;
}
