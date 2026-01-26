// SVG namespace
const NS = 'http://www.w3.org/2000/svg';

function createSvgElement(tag) {
    return document.createElementNS(NS, tag);
}

function clearSvg(svg) {
    while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
    }
}

function formatXpShort(xp) {
    if (xp >= 1000000) return (xp / 1000000).toFixed(1) + 'M';
    if (xp >= 1000) return (xp / 1000).toFixed(1) + 'K';
    return xp.toString();
}

function formatDateShort(date) {
    return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

// ============ XP TIMELINE CHART ============
export function renderXpTimeline(svg, data) {
    clearSvg(svg);
    
    const width = 800;
    const height = 300;
    const padding = { top: 30, right: 30, bottom: 50, left: 70 };
    
    // Background
    const bg = createSvgElement('rect');
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', 'transparent');
    svg.appendChild(bg);
    
    if (!data?.length) {
        const text = createSvgElement('text');
        text.setAttribute('x', width / 2);
        text.setAttribute('y', height / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#6b7280');
        text.setAttribute('font-size', '14');
        text.textContent = 'No XP data available';
        svg.appendChild(text);
        return;
    }
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const dates = data.map(d => d.date.getTime());
    const xps = data.map(d => d.xp);
    
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const maxXp = Math.max(...xps);
    
    const xScale = (date) => {
        if (maxDate === minDate) return padding.left + chartWidth / 2;
        return padding.left + ((date - minDate) / (maxDate - minDate)) * chartWidth;
    };
    
    const yScale = (xp) => {
        if (maxXp === 0) return padding.top + chartHeight;
        return padding.top + chartHeight - (xp / maxXp) * chartHeight;
    };
    
    // Grid lines
    const gridGroup = createSvgElement('g');
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (i / 4) * chartHeight;
        const line = createSvgElement('line');
        line.setAttribute('x1', padding.left);
        line.setAttribute('x2', width - padding.right);
        line.setAttribute('y1', y);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#1f2937');
        line.setAttribute('stroke-dasharray', '4,4');
        gridGroup.appendChild(line);
        
        // Y-axis labels
        const label = createSvgElement('text');
        label.setAttribute('x', padding.left - 10);
        label.setAttribute('y', y + 4);
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('fill', '#6b7280');
        label.setAttribute('font-size', '11');
        label.textContent = formatXpShort(maxXp * (1 - i / 4));
        gridGroup.appendChild(label);
    }
    svg.appendChild(gridGroup);
    
    // Area fill
    const areaPath = createSvgElement('path');
    let areaD = `M ${xScale(dates[0])} ${yScale(0)}`;
    data.forEach(d => {
        areaD += ` L ${xScale(d.date.getTime())} ${yScale(d.xp)}`;
    });
    areaD += ` L ${xScale(dates[dates.length - 1])} ${yScale(0)} Z`;
    
    // Gradient definition
    const defs = createSvgElement('defs');
    const gradient = createSvgElement('linearGradient');
    gradient.setAttribute('id', 'xpGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = createSvgElement('stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#ff770069');
    
    const stop2 = createSvgElement('stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'rgba(255, 120, 0, 0)');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);
    
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('fill', 'url(#xpGradient)');
    svg.appendChild(areaPath);
    
    // Line
    const linePath = createSvgElement('path');
    let lineD = `M ${xScale(dates[0])} ${yScale(data[0].xp)}`;
    data.forEach((d, i) => {
        if (i > 0) lineD += ` L ${xScale(d.date.getTime())} ${yScale(d.xp)}`;
    });
    linePath.setAttribute('d', lineD);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', '#ffffffa8');
    linePath.setAttribute('stroke-width', '3');
    linePath.setAttribute('stroke-linecap', 'round');
    linePath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(linePath);
    
    // Data points (sampled for performance)
    const pointGroup = createSvgElement('g');
    const step = Math.max(1, Math.floor(data.length / 20));
    for (let i = 0; i < data.length; i += step) {
        const d = data[i];
        const circle = createSvgElement('circle');
        circle.setAttribute('cx', xScale(d.date.getTime()));
        circle.setAttribute('cy', yScale(d.xp));
        circle.setAttribute('r', '5');
        circle.setAttribute('fill', '#ffffff');
        circle.setAttribute('stroke', '#0a0e17');
        circle.setAttribute('stroke-width', '2');
        circle.style.cursor = 'pointer';
        
        const title = createSvgElement('title');
        title.textContent = `${d.project}\n${formatXpShort(d.xp)} XP\n${d.date.toLocaleDateString()}`;
        circle.appendChild(title);
        
        pointGroup.appendChild(circle);
    }
    svg.appendChild(pointGroup);
    
    // X-axis labels
    const xAxisGroup = createSvgElement('g');
    const labelCount = Math.min(5, data.length);
    for (let i = 0; i < labelCount; i++) {
        const idx = Math.floor(i * (data.length - 1) / (labelCount - 1));
        const d = data[idx];
        const label = createSvgElement('text');
        label.setAttribute('x', xScale(d.date.getTime()));
        label.setAttribute('y', height - 15);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#6b7280');
        label.setAttribute('font-size', '11');
        label.textContent = formatDateShort(d.date);
        xAxisGroup.appendChild(label);
    }
    svg.appendChild(xAxisGroup);
}

// ============ PASS/FAIL DONUT CHART ============
export function renderPassFailDonut(svg, pass, fail) {
    clearSvg(svg);
    
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 90;
    const thickness = 25;
    
    const total = (pass || 0) + (fail || 0);
    
    if (total === 0) {
        const text = createSvgElement('text');
        text.setAttribute('x', cx);
        text.setAttribute('y', cy);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#6b7280');
        text.setAttribute('font-size', '14');
        text.textContent = 'No data';
        svg.appendChild(text);
        return;
    }
    
    const passRatio = pass / total;
    const passAngle = passRatio * 2 * Math.PI;
    
    // Background ring
    const bgRing = createSvgElement('circle');
    bgRing.setAttribute('cx', cx);
    bgRing.setAttribute('cy', cy);
    bgRing.setAttribute('r', radius);
    bgRing.setAttribute('fill', 'none');
    bgRing.setAttribute('stroke', '#1f2937');
    bgRing.setAttribute('stroke-width', thickness);
    svg.appendChild(bgRing);
    
    // Helper function for arc path
    function arcPath(startAngle, endAngle) {
        const start = {
            x: cx + radius * Math.cos(startAngle - Math.PI / 2),
            y: cy + radius * Math.sin(startAngle - Math.PI / 2)
        };
        const end = {
            x: cx + radius * Math.cos(endAngle - Math.PI / 2),
            y: cy + radius * Math.sin(endAngle - Math.PI / 2)
        };
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    }
    
    // Pass arc (green)
    if (pass > 0) {
        const passArc = createSvgElement('path');
        passArc.setAttribute('d', arcPath(0, passAngle));
        passArc.setAttribute('fill', 'none');
        passArc.setAttribute('stroke', '#33cc33');
        passArc.setAttribute('stroke-width', thickness);
        passArc.setAttribute('stroke-linecap', 'round');
        
        const passTitle = createSvgElement('title');
        passTitle.textContent = `Pass: ${pass}`;
        passArc.appendChild(passTitle);
        
        svg.appendChild(passArc);
    }
    
    // Fail arc (red)
    if (fail > 0) {
        const failArc = createSvgElement('path');
        failArc.setAttribute('d', arcPath(passAngle, 2 * Math.PI));
        failArc.setAttribute('fill', 'none');
        failArc.setAttribute('stroke', '#ff7700');
        failArc.setAttribute('stroke-width', thickness);
        failArc.setAttribute('stroke-linecap', 'round');
        
        const failTitle = createSvgElement('title');
        failTitle.textContent = `Fail: ${fail}`;
        failArc.appendChild(failTitle);
        
        svg.appendChild(failArc);
    }
    
    // Center percentage
    const pctText = createSvgElement('text');
    pctText.setAttribute('x', cx);
    pctText.setAttribute('y', cy - 5);
    pctText.setAttribute('text-anchor', 'middle');
    pctText.setAttribute('fill', '#f3f4f6');
    pctText.setAttribute('font-size', '32');
    pctText.setAttribute('font-weight', 'bold');
    pctText.textContent = `${Math.round(passRatio * 100)}%`;
    svg.appendChild(pctText);
    
    const labelText = createSvgElement('text');
    labelText.setAttribute('x', cx);
    labelText.setAttribute('y', cy + 20);
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('fill', '#6b7280');
    labelText.setAttribute('font-size', '12');
    labelText.textContent = 'pass rate';
    svg.appendChild(labelText);
    
    // Legend
    const legendY = size - 30;
    
    // Pass legend
    const passRect = createSvgElement('rect');
    passRect.setAttribute('x', cx - 70);
    passRect.setAttribute('y', legendY);
    passRect.setAttribute('width', 12);
    passRect.setAttribute('height', 12);
    passRect.setAttribute('rx', 2);
    passRect.setAttribute('fill', '#33cc33');
    svg.appendChild(passRect);
    
    const passLabel = createSvgElement('text');
    passLabel.setAttribute('x', cx - 54);
    passLabel.setAttribute('y', legendY + 10);
    passLabel.setAttribute('fill', '#9ca3af');
    passLabel.setAttribute('font-size', '11');
    passLabel.textContent = `Pass: ${pass}`;
    svg.appendChild(passLabel);
    
    // Fail legend
    const failRect = createSvgElement('rect');
    failRect.setAttribute('x', cx + 20);
    failRect.setAttribute('y', legendY);
    failRect.setAttribute('width', 12);
    failRect.setAttribute('height', 12);
    failRect.setAttribute('rx', 2);
    failRect.setAttribute('fill', '#ff7800');
    svg.appendChild(failRect);
    
    const failLabel = createSvgElement('text');
    failLabel.setAttribute('x', cx + 36);
    failLabel.setAttribute('y', legendY + 10);
    failLabel.setAttribute('fill', '#9ca3af');
    failLabel.setAttribute('font-size', '11');
    failLabel.textContent = `Fail: ${fail}`;
    svg.appendChild(failLabel);
}

// ============ SKILLS BAR CHART ============
export function renderSkillsChart(svg, skills) {
    clearSvg(svg);
    
    const width = 400;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 50;
    
    if (!skills?.length) {
        const text = createSvgElement('text');
        text.setAttribute('x', centerX);
        text.setAttribute('y', centerY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#6b7280');
        text.setAttribute('font-size', '14');
        text.textContent = 'No skill data available';
        svg.appendChild(text);
        return;
    }
    
    // Limit to 8 skills for better visualization
    const displaySkills = skills.slice(0, 8);
    const numPoints = displaySkills.length;
    const angleStep = (2 * Math.PI) / numPoints;
    const maxValue = Math.max(...displaySkills.map(s => s.value), 100);
    
    // Gradient for the filled area
    const defs = createSvgElement('defs');
    const gradient = createSvgElement('linearGradient');
    gradient.setAttribute('id', 'radarGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = createSvgElement('stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#ffffff33');
    
    const stop2 = createSvgElement('stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#ffffff33');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);
    
    // Draw background circles (web)
    const levels = 5;
    for (let level = 1; level <= levels; level++) {
        const radius = (maxRadius / levels) * level;
        
        // Polygon for each level
        let points = '';
        for (let i = 0; i < numPoints; i++) {
            const angle = i * angleStep - Math.PI / 2; // Start from top
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            points += `${x},${y} `;
        }
        
        const polygon = createSvgElement('polygon');
        polygon.setAttribute('points', points.trim());
        polygon.setAttribute('fill', 'none');
        polygon.setAttribute('stroke', '#1f2937');
        polygon.setAttribute('stroke-width', level === levels ? '2' : '1');
        polygon.setAttribute('stroke-dasharray', level === levels ? 'none' : '4,4');
        svg.appendChild(polygon);
    }
    
    // Draw axis lines
    for (let i = 0; i < numPoints; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + maxRadius * Math.cos(angle);
        const y = centerY + maxRadius * Math.sin(angle);
        
        const line = createSvgElement('line');
        line.setAttribute('x1', centerX);
        line.setAttribute('y1', centerY);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#374151');
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
    }
    
    // Calculate data points
    let dataPoints = '';
    const pointCoords = [];
    
    for (let i = 0; i < numPoints; i++) {
        const skill = displaySkills[i];
        const angle = i * angleStep - Math.PI / 2;
        const value = skill.value;
        const radius = (value / maxValue) * maxRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        dataPoints += `${x},${y} `;
        pointCoords.push({ x, y, skill });
    }
    
    // Draw filled area
    const dataPolygon = createSvgElement('polygon');
    dataPolygon.setAttribute('points', dataPoints.trim());
    dataPolygon.setAttribute('fill', 'url(#radarGradient)');
    dataPolygon.setAttribute('stroke', '#06b6d4');
    dataPolygon.setAttribute('stroke-width', '2');
    svg.appendChild(dataPolygon);
    
    // Draw data points and labels
    for (let i = 0; i < numPoints; i++) {
        const { x, y, skill } = pointCoords[i];
        const angle = i * angleStep - Math.PI / 2;
        
        // Data point circle
        const circle = createSvgElement('circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', '#06b6d4');
        circle.setAttribute('stroke', '#0e7490');
        circle.setAttribute('stroke-width', '2');
        
        const title = createSvgElement('title');
        title.textContent = `${skill.name}: ${Math.round(skill.value)}%`;
        circle.appendChild(title);
        
        svg.appendChild(circle);
        
        // Label position (outside the radar)
        const labelRadius = maxRadius + 25;
        const labelX = centerX + labelRadius * Math.cos(angle);
        const labelY = centerY + labelRadius * Math.sin(angle);
        
        // Adjust text anchor based on position
        let textAnchor = 'middle';
        if (labelX < centerX - 10) textAnchor = 'end';
        else if (labelX > centerX + 10) textAnchor = 'start';
        
        const label = createSvgElement('text');
        label.setAttribute('x', labelX);
        label.setAttribute('y', labelY);
        label.setAttribute('text-anchor', textAnchor);
        label.setAttribute('fill', '#9ca3af');
        label.setAttribute('font-size', '11');
        label.setAttribute('font-weight', '500');
        label.textContent = skill.name.charAt(0).toUpperCase() + skill.name.slice(1);
        svg.appendChild(label);
        
        // Value label
        const valueLabel = createSvgElement('text');
        valueLabel.setAttribute('x', labelX);
        valueLabel.setAttribute('y', labelY + 12);
        valueLabel.setAttribute('text-anchor', textAnchor);
        valueLabel.setAttribute('fill', '#06b6d4');
        valueLabel.setAttribute('font-size', '10');
        valueLabel.setAttribute('font-weight', '600');
        valueLabel.textContent = `${Math.round(skill.value)}%`;
        svg.appendChild(valueLabel);
    }
}
