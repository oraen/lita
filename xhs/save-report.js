// Replaces browser download/share in the mini-tool build only.
export function bindReportSave(button, outputImage, showToast) {
  let saving = false;
  button.addEventListener("click", async () => {
    if (saving || !outputImage.src.startsWith("data:image/")) return;
    const bridge = window.xhs && window.xhs.miniTool;
    if (!bridge || !bridge.writeTempFile || !bridge.saveImageToPhotosAlbum) {
      showToast("请在小红书小工具中保存到相册");
      return;
    }
    saving = true;
    button.disabled = true;
    button.textContent = "正在保存…";
    try {
      const result = await bridge.writeTempFile({ data: outputImage.src });
      if (!result || !result.filePath) throw new Error("未取得图片文件");
      await bridge.saveImageToPhotosAlbum({ filePath: result.filePath });
      showToast("报告已保存到相册");
    } catch (error) {
      showToast("保存失败，请检查相册权限后重试");
      console.warn("报告保存失败", error && (error.errMsg || error.message));
    } finally {
      saving = false;
      button.disabled = false;
      button.textContent = "保存报告图片";
    }
  });
}
