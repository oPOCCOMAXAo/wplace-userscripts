class Image {
  /**
   * Generate a badge number for notifications.
   *
   * @returns {string} - data url for badge image.
   */
  static generateBadgeCounter({ counter, bgColor, textColor, size = 96, textSize = 40 }) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = `bold ${textSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(counter, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL();
  }
}
