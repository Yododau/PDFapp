let currentTemplate = "3blocks";      // デフォルト：在留カード（画像2枚）
let currentTextBlock = null;

const templateSelect = document.getElementById("template-select");
const a4Inner = document.getElementById("a4-inner");
const pdfPreviewContainer = document.getElementById("pdf-preview-container");
const pdfPreviewFrame = document.getElementById("pdf-preview-frame");
const textModal = document.getElementById("text-edit-modal");
const textInput = document.getElementById("text-input");
const filenameInput = document.getElementById("filename-input");

// -------------- [PATCH] Shortcuts Auto Save helpers --------------
const SHORTCUT_NAME = "SavePDF"; // Shortcuts のショートカット名（必ず同じに）
const SHORTCUT_SEP = "||";       // filename と base64 を分ける区切り

function showToastJP(message) {
  // シンプルな日本語トースト（既存UIに合わせて短く）
  let toast = document.getElementById("save-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "save-toast";
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "90px";
    toast.style.transform = "translateX(-50%)";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "12px";
    toast.style.background = "rgba(20,20,20,0.78)";
    toast.style.color = "#fff";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "9999";
    toast.style.backdropFilter = "blur(10px)";
    toast.style.webkitBackdropFilter = "blur(10px)";
    toast.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
    toast.style.opacity = "0";
    toast.style.transition = "opacity .18s ease, transform .18s ease";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(-6px)";
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(0px)";
  }, 1100);
}

// Shortcuts から戻ってきた時の表示: ?saved=1 を見て「保存しました。」表示
(function handleReturnedFromShortcut() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("saved") === "1") {
      showToastJP("保存しました。");

      // URLから?saved=1を消す（リロード等で何度も出ないように）
      url.searchParams.delete("saved");
      window.history.replaceState({}, "", url.toString());
    }
  } catch (e) {
    // ignore
  }
})();

// PDF(blob)を Shortcuts に渡して自動保存
function sendPDFToShortcut(pdf, fileNameNoExt) {
  // fileNameNoExt は既存ロジックの filename（拡張子なし前提）を受け取る
  const finalName = `${fileNameNoExt}.pdf`;

  const blob = pdf.output("blob");
  const reader = new FileReader();

  reader.onloadend = () => {
    const base64 = String(reader.result).split(",")[1] || "";

    // filename||base64 形式で渡す（Shortcut側でSplit）
    const payload = `${finalName}${SHORTCUT_SEP}${base64}`;

    // 保存完了後に戻るURL（同じページに?saved=1を付ける）
    let returnURL = "";
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("saved", "1");
      returnURL = u.toString();
    } catch (e) {
      returnURL = window.location.href + (window.location.href.includes("?") ? "&" : "?") + "saved=1";
    }

    const shortcutURL =
      "shortcuts://run-shortcut" +
      "?name=" + encodeURIComponent(SHORTCUT_NAME) +
      "&input=text" +
      "&text=" + encodeURIComponent(payload) +
      "&x-success=" + encodeURIComponent(returnURL);

    window.location.href = shortcutURL;
  };

  reader.readAsDataURL(blob);
}
// -------------- [PATCH] end --------------


// ----------------- テンプレ切替 -----------------
templateSelect.addEventListener("change", () => {
  currentTemplate = templateSelect.value;
  renderTemplate(currentTemplate);
});

function renderTemplate(template) {
  a4Inner.innerHTML = "";

  if (template === "3blocks") {
    // 画像2ブロック + テキスト3ブロック
    a4Inner.innerHTML = `
      <div class="img-row">
        <div class="img-block" data-img="1">
          <div class="img-placeholder">タップして画像</div>
          <img class="img-preview hidden" />
          <input type="file" accept="image/*" capture="environment" class="img-input hidden" />
        </div>
        <div class="img-block" data-img="2">
          <div class="img-placeholder">タップして画像</div>
          <img class="img-preview hidden" />
          <input type="file" accept="image/*" capture="environment" class="img-input hidden" />
        </div>
      </div>

      <div class="text-col">
        <div class="text-block" data-text="1"><span class="text-placeholder">タップしてテキスト入力</span></div>
        <div class="text-block" data-text="2"><span class="text-placeholder">タップしてテキスト入力</span></div>
        <div class="text-block" data-text="3"><span class="text-placeholder">タップしてテキスト入力</span></div>
      </div>
    `;
  } else {
    // 画像1ブロック + テキスト4ブロック（例）
    a4Inner.innerHTML = `
      <div class="img-row single">
        <div class="img-block" data-img="1">
          <div class="img-placeholder">タップして画像</div>
          <img class="img-preview hidden" />
          <input type="file" accept="image/*" capture="environment" class="img-input hidden" />
        </div>
      </div>

      <div class="text-col">
        <div class="text-block" data-text="1"><span class="text-placeholder">タップしてテキスト入力</span></div>
        <div class="text-block" data-text="2"><span class="text-placeholder">タップしてテキスト入力</span></div>
        <div class="text-block" data-text="3"><span class="text-placeholder">タップしてテキスト入力</span></div>
        <div class="text-block" data-text="4"><span class="text-placeholder">タップしてテキスト入力</span></div>
      </div>
    `;
  }

  bindBlocks();
}

function bindBlocks() {
  // 画像ブロック
  document.querySelectorAll(".img-block").forEach((block) => {
    block.addEventListener("click", () => openImagePicker(block));
  });

  // テキストブロック
  document.querySelectorAll(".text-block").forEach((block) => {
    block.addEventListener("click", () => openTextModal(block));
  });
}

// ----------------- 画像選択 -----------------
function openImagePicker(block) {
  const input = block.querySelector(".img-input");
  const img = block.querySelector(".img-preview");
  const ph = block.querySelector(".img-placeholder");

  if (!input) return;

  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      img.classList.remove("hidden");
      ph.classList.add("hidden");
      // cover表示（背景的に埋める）
      img.style.objectFit = "cover";
      img.style.width = "100%";
      img.style.height = "100%";
    };
    reader.readAsDataURL(file);
  };

  input.click();
}

// ----------------- テキスト入力 -----------------
function openTextModal(block) {
  currentTextBlock = block;

  const currentText = block.dataset.value || "";
  textInput.value = currentText;

  textModal.classList.remove("hidden");

  // フォーカス
  setTimeout(() => {
    textInput.focus();
    textInput.setSelectionRange(textInput.value.length, textInput.value.length);
  }, 30);
}

// モーダル外タップで保存
if (textModal) {
  textModal.addEventListener("click", (e) => {
    if (e.target === textModal) {
      saveTextModal();
    }
  });
}

document.getElementById("text-save-btn")?.addEventListener("click", saveTextModal);
document.getElementById("text-clear-btn")?.addEventListener("click", () => {
  if (!currentTextBlock) return;
  currentTextBlock.dataset.value = "";
  currentTextBlock.innerHTML = `<span class="text-placeholder">タップしてテキスト入力</span>`;
  textModal.classList.add("hidden");
  currentTextBlock = null;
});

function saveTextModal() {
  if (!currentTextBlock) return;

  const v = (textInput.value || "").trim();
  currentTextBlock.dataset.value = v;

  if (v) {
    currentTextBlock.textContent = v;
  } else {
    currentTextBlock.innerHTML = `<span class="text-placeholder">タップしてテキスト入力</span>`;
  }

  textModal.classList.add("hidden");
  currentTextBlock = null;
}

// ----------------- Clear All -----------------
document.getElementById("clear-all").addEventListener("click", () => {
  if (!confirm("すべてクリアしますか？")) return;

  // 画像リセット
  document.querySelectorAll(".img-block").forEach((block) => {
    const img = block.querySelector(".img-preview");
    const ph = block.querySelector(".img-placeholder");
    const input = block.querySelector(".img-input");
    if (img) {
      img.src = "";
      img.classList.add("hidden");
    }
    if (ph) ph.classList.remove("hidden");
    if (input) input.value = "";
  });

  // テキストリセット
  document.querySelectorAll(".text-block").forEach((block) => {
    block.dataset.value = "";
    block.innerHTML = `<span class="text-placeholder">タップしてテキスト入力</span>`;
  });

  // プレビューを閉じる
  pdfPreviewContainer?.classList.add("hidden");
  pdfPreviewFrame.src = "about:blank";
});

// ----------------- PDF作成（hozon） -----------------
document.getElementById("export-pdf").addEventListener("click", async () => {
  // ファイル名
  const fileName = (filenameInput?.value || "").trim() || "PDF";

  if (!confirm("PDFを保存しますか？")) return;

  // A4をCanvas化 → jsPDF
  const a4 = document.getElementById("a4");
  if (!a4) return;

  // 既存の方式を維持：html2canvas を想定
  const canvas = await html2canvas(a4, {
    scale: 2,
    backgroundColor: null,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 1.0);

  const pdf = new jspdf.jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // A4にフィット（中央寄せ）
  const imgProps = pdf.getImageProperties(imgData);
  const imgRatio = imgProps.width / imgProps.height;
  const pageRatio = pageWidth / pageHeight;

  let renderW, renderH;
  if (imgRatio > pageRatio) {
    renderW = pageWidth;
    renderH = pageWidth / imgRatio;
  } else {
    renderH = pageHeight;
    renderW = pageHeight * imgRatio;
  }

  const offsetX = (pageWidth - renderW) / 2;
  const offsetY = (pageHeight - renderH) / 2;

  pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderW, renderH);

  // ------------- [PATCH] iPhone Shortcuts auto-save -------------
  // 既存の命名を維持：fileName + ".pdf"
  // Shortcuts に渡して自動保存 → 保存後に戻って「保存しました。」表示
  sendPDFToShortcut(pdf, fileName);
  // ------------- [PATCH] end -------------
});

// 初期レンダ
renderTemplate(currentTemplate);
