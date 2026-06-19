const GISTS_API = "https://api.github.com/users/tkatochin/gists?per_page=100";
const ALL_PROMPT_PATTERN = /\.prompt$/;
const CATEGORY_OPTIONS = [
  {
    value: "snsprof",
    label: "SNSプロフィールスクショから画像生成",
    filenamePrefix: "snsprof",
  },
];

const statusEl = document.getElementById("status");
const listEl = document.getElementById("prompt-list");
const toastEl = document.getElementById("toast");
const categorySelectEl = document.getElementById("category-select");

let toastTimer = null;
let allEntries = [];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPromptEntries(gists) {
  const entries = [];

  for (const gist of gists) {
    const files = Object.values(gist.files || {});

    for (const file of files) {
      if (!ALL_PROMPT_PATTERN.test(file.filename)) {
        continue;
      }

      entries.push({
        gistId: gist.id,
        title: (gist.description || "").trim() || file.filename,
        filename: file.filename,
        rawUrl: file.raw_url,
        updatedAt: gist.updated_at,
      });
    }
  }

  entries.sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
  return entries;
}

function renderCategoryOptions(categories) {
  categorySelectEl.innerHTML = "";

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category.value;
    option.textContent = category.label;
    categorySelectEl.appendChild(option);
  }

  categorySelectEl.selectedIndex = -1;
}

function buildPrefixPattern(prefix) {
  return new RegExp(`^${escapeRegExp(prefix)}.*\\.prompt$`);
}

function getFilteredEntries(entries, selectedValue) {
  if (!selectedValue) {
    return entries;
  }

  const category = CATEGORY_OPTIONS.find((item) => item.value === selectedValue);
  if (!category) {
    return entries;
  }

  const pattern = buildPrefixPattern(category.filenamePrefix);
  return entries.filter((entry) => pattern.test(entry.filename));
}

function showToast(message) {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastEl.textContent = message;
  toastEl.classList.add("show");

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2000);
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error("クリップボードへのコピーに失敗しました。");
  }
}

async function handleCopy(entry) {
  const response = await fetch(entry.rawUrl, {
    headers: {
      Accept: "text/plain",
    },
  });

  if (!response.ok) {
    throw new Error("Rawテキストの取得に失敗しました。");
  }

  const rawText = await response.text();
  await copyToClipboard(rawText);
  showToast(`${entry.title}のプロンプトをコピーしました`);
}

function renderList(entries) {
  listEl.innerHTML = "";

  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "prompt-item";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = entry.title;
    button.dataset.gistId = entry.gistId;

    button.addEventListener("click", async () => {
      try {
        await handleCopy(entry);
      } catch (error) {
        showToast(error.message || "コピーに失敗しました");
      }
    });

    li.appendChild(button);
    listEl.appendChild(li);
  }
}

async function updateViewForSelectedCategory(entries) {
  const selectedValue = categorySelectEl.value;
  const filteredEntries = getFilteredEntries(entries, selectedValue);
  const selectedCategory = CATEGORY_OPTIONS.find((item) => item.value === selectedValue);

  if (filteredEntries.length === 0) {
    if (!selectedCategory) {
      statusEl.textContent = "*.prompt に一致するファイルが見つかりませんでした。";
    } else {
      statusEl.textContent = `カテゴリ「${selectedCategory.label}」に一致するファイル（${selectedCategory.filenamePrefix}*.prompt）が見つかりませんでした。`;
    }
    listEl.innerHTML = "";
    return;
  }

  if (!selectedCategory) {
    statusEl.textContent = `${filteredEntries.length}件のプロンプトを表示中（*.prompt）`;
  } else {
    statusEl.textContent = `カテゴリ「${selectedCategory.label}」で${filteredEntries.length}件のプロンプトを表示中（${selectedCategory.filenamePrefix}*.prompt）`;
  }

  renderList(filteredEntries);
  await autoCopyFromHash(filteredEntries);
}

function getHashGistId() {
  const hash = window.location.hash.trim();
  if (!hash) {
    return "";
  }
  return hash.startsWith("#") ? hash.slice(1) : hash;
}

async function autoCopyFromHash(entries) {
  const gistId = getHashGistId();
  if (!gistId) {
    return;
  }

  const target = entries.find((entry) => entry.gistId === gistId);
  if (!target) {
    showToast(`指定されたgist-id (${gistId}) が見つかりません`);
    return;
  }

  try {
    await handleCopy(target);
  } catch (error) {
    showToast(error.message || "自動コピーに失敗しました");
  }
}

async function init() {
  try {
    statusEl.textContent = "Gist一覧を読み込んでいます...";
    renderCategoryOptions(CATEGORY_OPTIONS);

    const response = await fetch(GISTS_API, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error("Gist一覧の取得に失敗しました。");
    }

    const gists = await response.json();
    const entries = extractPromptEntries(gists);
    allEntries = entries;

    if (entries.length === 0) {
      statusEl.textContent = "*.prompt に一致するファイルが見つかりませんでした。";
      return;
    }

    await updateViewForSelectedCategory(entries);

    categorySelectEl.addEventListener("change", async () => {
      await updateViewForSelectedCategory(allEntries);
    });
  } catch (error) {
    statusEl.textContent = "読み込みに失敗しました。時間をおいて再度お試しください。";
    showToast(error.message || "初期化に失敗しました");
  }
}

init();
