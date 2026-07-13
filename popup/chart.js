// chart.js - Dependency-free, lightweight SVG bar chart builder for statistics page

export function renderFocusChart(container, dailyData) {
  if (!container) return;
  container.innerHTML = '';

  // Get last 7 days keys and values
  const labels = [];
  const values = [];
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    
    // Label format: Mon, Tue
    labels.push(daysOfWeek[d.getDay()]);
    
    // Key format: YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    
    const dayStats = dailyData[key];
    values.push(dayStats ? dayStats.focusTime : 0);
  }

  // Find max value for scaling (min 60 minutes to keep scale nice)
  const maxValue = Math.max(...values, 60);

  // SVG parameters
  const width = container.clientWidth || 360;
  const height = 150;
  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barWidth = (chartWidth / 7) - 12;

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.overflow = 'visible';

  // Add gradient definition
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EECC8C" />
      <stop offset="100%" stop-color="#EBB288" />
    </linearGradient>
    <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ECE8E3" stop-opacity="1" />
      <stop offset="100%" stop-color="#ECE8E3" stop-opacity="0.2" />
    </linearGradient>
  `;
  svg.appendChild(defs);

  // Draw background grid lines (horizontal scale lines)
  const gridLines = 3;
  for (let i = 0; i <= gridLines; i++) {
    const yVal = maxValue * (i / gridLines);
    const yPos = chartHeight + paddingTop - (chartHeight * (i / gridLines));
    
    // Grid line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', paddingLeft);
    line.setAttribute('y1', yPos);
    line.setAttribute('x2', width - paddingRight);
    line.setAttribute('y2', yPos);
    line.setAttribute('stroke', 'url(#gridGrad)');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    // Y Axis labels
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', paddingLeft - 6);
    text.setAttribute('y', yPos + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#757575');
    text.style.fontSize = '9px';
    text.style.fontFamily = 'Inter, sans-serif';
    text.style.fontWeight = '500';
    text.textContent = Math.round(yVal) + 'm';
    svg.appendChild(text);
  }

  // Draw bars
  for (let i = 0; i < 7; i++) {
    const val = values[i];
    const barHeight = (val / maxValue) * chartHeight;
    const xPos = paddingLeft + (i * (chartWidth / 7)) + 6;
    const yPos = chartHeight + paddingTop - barHeight;

    // Bar background track (light gray)
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    track.setAttribute('x', xPos);
    track.setAttribute('y', paddingTop);
    track.setAttribute('width', barWidth);
    track.setAttribute('height', chartHeight);
    track.setAttribute('rx', 6);
    track.setAttribute('ry', 6);
    track.setAttribute('fill', '#FAFAF7');
    track.setAttribute('stroke', '#E8E4DE');
    track.setAttribute('stroke-width', '1');
    svg.appendChild(track);

    // Active Bar
    if (barHeight > 0) {
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', xPos);
      bar.setAttribute('y', yPos);
      bar.setAttribute('width', barWidth);
      bar.setAttribute('height', barHeight);
      bar.setAttribute('rx', 6);
      bar.setAttribute('ry', 6);
      bar.setAttribute('fill', 'url(#barGrad)');
      
      // Animate height
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'height');
      animate.setAttribute('from', '0');
      animate.setAttribute('to', barHeight);
      animate.setAttribute('dur', '0.4s');
      animate.setAttribute('fill', 'freeze');
      bar.appendChild(animate);
      
      const animateY = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animateY.setAttribute('attributeName', 'y');
      animateY.setAttribute('from', chartHeight + paddingTop);
      animateY.setAttribute('to', yPos);
      animateY.setAttribute('dur', '0.4s');
      animateY.setAttribute('fill', 'freeze');
      bar.appendChild(animateY);

      // Tooltip/Value indicator on hover
      bar.addEventListener('mouseenter', () => {
        bar.setAttribute('fill', '#A36361'); // Highlight with Terracotta on hover
      });
      bar.addEventListener('mouseleave', () => {
        bar.setAttribute('fill', 'url(#barGrad)');
      });

      // Add a tooltip title
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${val} mins focused`;
      bar.appendChild(title);

      svg.appendChild(bar);
    }

    // X Axis labels (days)
    const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelText.setAttribute('x', xPos + (barWidth / 2));
    labelText.setAttribute('y', height - 8);
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('fill', '#4D4D4D');
    labelText.style.fontSize = '10px';
    labelText.style.fontFamily = 'Inter, sans-serif';
    labelText.style.fontWeight = '600';
    labelText.textContent = labels[i];
    svg.appendChild(labelText);
  }

  container.appendChild(svg);
}
