export interface WatermarkData {
  residentFullName: string;
  roomNumber: string;
  bedNumber: string;
  caregiverName: string;
  timestamp: Date;
  isBefore7am: boolean;
  bloodPressure?: string;
  pulseRate?: number;
  spo2?: number;
  temperature?: number;
}

/**
 * Renders a crisp clinical watermark overlay with exact date, time, resident tag,
 * and pre-7AM verification onto any vital signs photo using HTML5 Canvas.
 */
export async function applyVitalsWatermark(
  imageSource: string,
  data: WatermarkData
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(imageSource);
        return;
      }

      // Maintain good resolution
      const width = Math.max(img.naturalWidth || 800, 800);
      const height = Math.max(img.naturalHeight || 600, 600);

      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Date & Time formatting
      const dateStr = data.timestamp.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
      const timeStr = data.timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const hours = data.timestamp.getHours();
      const isPre7am = hours < 7;

      // Watermark Overlay Ribbon at bottom
      const ribbonHeight = Math.max(height * 0.22, 110);
      const ribbonY = height - ribbonHeight;

      // Gradient background for legibility
      const gradient = ctx.createLinearGradient(0, ribbonY - 20, 0, height);
      gradient.addColorStop(0, 'rgba(26, 32, 24, 0)');
      gradient.addColorStop(0.2, 'rgba(26, 32, 24, 0.88)');
      gradient.addColorStop(1, 'rgba(18, 22, 16, 0.96)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, ribbonY - 20, width, ribbonHeight + 20);

      // Accent border line
      ctx.strokeStyle = '#889E81';
      ctx.lineWidth = Math.max(width * 0.003, 3);
      ctx.beginPath();
      ctx.moveTo(0, ribbonY);
      ctx.lineTo(width, ribbonY);
      ctx.stroke();

      // Scaled typography
      const baseFontSize = Math.max(width * 0.02, 13);
      const titleFontSize = Math.max(width * 0.024, 15);
      const paddingX = Math.max(width * 0.03, 20);

      // 1. Header line: Protocol Badge
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      ctx.fillStyle = '#FAF9F6';
      ctx.fillText(`CARE CONNECT • CLINICAL VITALS AUDIT`, paddingX, ribbonY + baseFontSize * 1.6);

      // Badge on top-right of ribbon
      const badgeText = isPre7am
        ? `✓ PRE-07:00 AM PROTOCOL VERIFIED`
        : `ROUTINE VITALS AUDIT`;
      ctx.font = `bold ${baseFontSize * 0.9}px sans-serif`;
      const badgeWidth = ctx.measureText(badgeText).width + 18;
      const badgeX = width - paddingX - badgeWidth;
      const badgeY = ribbonY + baseFontSize * 0.6;

      ctx.fillStyle = isPre7am ? 'rgba(136, 158, 129, 0.9)' : 'rgba(180, 140, 80, 0.9)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeWidth, baseFontSize * 1.5, 6);
      } else {
        ctx.rect(badgeX, badgeY, badgeWidth, baseFontSize * 1.5);
      }
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(badgeText, badgeX + 9, badgeY + baseFontSize * 1.1);

      // 2. Exact Timestamp (Date & Time)
      ctx.font = `bold ${baseFontSize * 1.05}px sans-serif`;
      ctx.fillStyle = '#E6E2D3';
      ctx.fillText(
        `📅 DATE: ${dateStr}   |   ⏰ TIME: ${timeStr}`,
        paddingX,
        ribbonY + baseFontSize * 3.1
      );

      // 3. Resident info & Caregiver signature
      ctx.font = `${baseFontSize * 0.95}px sans-serif`;
      ctx.fillStyle = '#D4D0C5';
      ctx.fillText(
        `👤 RESIDENT: ${data.residentFullName} (Room ${data.roomNumber}, ${data.bedNumber})`,
        paddingX,
        ribbonY + baseFontSize * 4.4
      );

      ctx.fillText(
        `🩺 STAFF: ${data.caregiverName} • Certified Digital Device Capture`,
        paddingX,
        ribbonY + baseFontSize * 5.6
      );

      // Top-Left Security Stamp
      ctx.fillStyle = 'rgba(20, 26, 18, 0.65)';
      const stampWidth = Math.max(width * 0.38, 240);
      const stampHeight = baseFontSize * 2.2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(paddingX, paddingX, stampWidth, stampHeight, 8);
      } else {
        ctx.rect(paddingX, paddingX, stampWidth, stampHeight);
      }
      ctx.fill();

      ctx.font = `bold ${baseFontSize * 0.85}px sans-serif`;
      ctx.fillStyle = '#889E81';
      ctx.fillText(`● SECURE VITALS PHOTO CAPTURE`, paddingX + 10, paddingX + baseFontSize * 1.0);
      ctx.font = `${baseFontSize * 0.75}px sans-serif`;
      ctx.fillStyle = '#FAF9F6';
      ctx.fillText(`TIMESTAMP: ${timeStr} • ${dateStr}`, paddingX + 10, paddingX + baseFontSize * 1.8);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = () => {
      resolve(imageSource);
    };

    img.src = imageSource;
  });
}
