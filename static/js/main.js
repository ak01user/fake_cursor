// 在文件开头添加缓存相关的常量和变量
const CACHE_KEY = {
    WORK_DIR: 'workDirectory',
    FOLDER_STATES: 'folderStates'
};

let fileContext = {};
let folderStates = {};  // 存储文件夹的展开状态

// 加载缓存的文件夹状态
try {
    folderStates = JSON.parse(localStorage.getItem(CACHE_KEY.FOLDER_STATES)) || {};
} catch (e) {
    folderStates = {};
}

// 在文件开头添加事件监听器设置
document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // 阻止默认的换行行为
            sendMessage();
        }
    });
});

// 文件选择处理
document.getElementById('fileInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // 清空之前的文件上下文
    fileContext = {};
    
    // 保存工作目录信息到缓存
    const directoryHandle = e.target.webkitdirectory ? {
        name: files[0].webkitRelativePath.split('/')[0],
        files: files.map(file => ({
            path: file.webkitRelativePath,
            lastModified: file.lastModified
        }))
    } : null;
    
    if (directoryHandle) {
        localStorage.setItem(CACHE_KEY.WORK_DIR, JSON.stringify(directoryHandle));
    }
    
    // 构建目录树结构
    const fileTree = buildFileTree(files);
    
    // 更新文件列表显示
    updateFileList(fileTree);
});

// 添加构建文件树的函数
function buildFileTree(files) {
    const fileTree = {};
    files.forEach(file => {
        const path = file.webkitRelativePath;
        const parts = path.split('/');
        let current = fileTree;
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                current[part] = file;
            } else {
                current[part] = current[part] || {};
                current = current[part];
            }
        });
    });
    return fileTree;
}

// 更新文件列表显示
function updateFileList(fileTree, parentElement = null, path = '') {
    const container = parentElement || document.getElementById('fileList');
    container.innerHTML = parentElement ? container.innerHTML : '';
    
    // 分离文件夹和文件
    const entries = Object.entries(fileTree);
    const folders = entries.filter(([_, value]) => !(value instanceof File));
    const files = entries.filter(([_, value]) => value instanceof File);
    
    // 处理文件夹
    folders.sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, value]) => {
        const div = document.createElement('div');
        div.className = 'file-item folder';
        
        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content ms-3';
        const fullPath = path + name;
        
        // 从缓存中获取文件夹状态
        const isExpanded = folderStates[fullPath] !== false;
        folderContent.style.display = isExpanded ? 'block' : 'none';
        
        const toggle = document.createElement('span');
        toggle.className = 'folder-toggle me-2';
        toggle.innerHTML = isExpanded ? '▼' : '▶';
        toggle.style.cursor = 'pointer';
        
        const label = document.createElement('span');
        label.textContent = name + '/';
        label.style.cursor = 'pointer';
        
        // 点击文件夹名或箭头时切换展开/收起状态
        const toggleFolder = () => {
            const newState = folderContent.style.display === 'none';
            folderContent.style.display = newState ? 'block' : 'none';
            toggle.innerHTML = newState ? '▼' : '▶';
            
            // 保存文件夹状态到缓存
            folderStates[fullPath] = newState;
            localStorage.setItem(CACHE_KEY.FOLDER_STATES, JSON.stringify(folderStates));
        };
        
        toggle.addEventListener('click', toggleFolder);
        label.addEventListener('click', toggleFolder);
        
        div.appendChild(toggle);
        div.appendChild(label);
        div.appendChild(folderContent);
        container.appendChild(div);
        
        updateFileList(value, folderContent, fullPath + '/');
    });
    
    // 然后处理文件
    files.sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, value]) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'me-2';
        checkbox.setAttribute('data-path', path + name);
        
        const label = document.createElement('span');
        label.textContent = name;
        label.style.cursor = 'pointer';
        
        // 添加点击预览功能
        label.addEventListener('click', () => {
            const reader = new FileReader();
            reader.onload = () => {
                showCodePreview(path + name, reader.result);
            };
            reader.readAsText(value);
        });
        
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                const reader = new FileReader();
                reader.onload = () => {
                    fileContext[path + name] = reader.result;
                    updateSelectedFiles();
                };
                reader.readAsText(value);
            } else {
                delete fileContext[path + name];
                updateSelectedFiles();
            }
        });
        
        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// 更新已选择的文件显示
function updateSelectedFiles() {
    const container = document.querySelector('.selected-files-list');
    container.innerHTML = '';
    
    Object.keys(fileContext).forEach(filepath => {
        const div = document.createElement('div');
        div.className = 'selected-file-item';
        
        const name = document.createElement('span');
        name.textContent = filepath;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-sm btn-danger ms-2';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
            delete fileContext[filepath];
            const checkbox = document.querySelector(`input[type="checkbox"][data-path="${filepath}"]`);
            if (checkbox) {
                checkbox.checked = false;
            }
            updateSelectedFiles();
        };
        
        div.appendChild(name);
        div.appendChild(removeBtn);
        container.appendChild(div);
    });
}

// 更新样式
const style = document.createElement('style');
style.textContent = `
.file-item {
    padding: 2px 0;
}
.folder {
    font-weight: bold;
}
.file-item input[type="checkbox"] {
    cursor: pointer;
}
.file-item span {
    cursor: default;
}
.folder-toggle {
    display: inline-block;
    width: 20px;
    text-align: center;
}
.selected-files {
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 10px;
}
.selected-file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: #f8f9fa;
    margin: 4px 0;
    border-radius: 4px;
}
.selected-file-item button {
    padding: 0 6px;
    font-size: 14px;
}

.preview-panel {
    height: 100vh;
    border-right: 1px solid #dee2e6;
    padding: 20px;
    display: flex;
    flex-direction: column;
}

.preview-header {
    margin-bottom: 15px;
}

.preview-header span {
    color: #666;
    font-size: 0.9em;
}

.preview-content {
    flex-grow: 1;
    overflow: auto;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 15px;
    margin: 0;
}

.preview-content code {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

// 调整其他面板的宽度
.files-panel {
    width: 16.666667%;
}

.chat-panel {
    width: 41.666667%;
}

.preview-panel {
    width: 41.666667%;
}
`;
document.head.appendChild(style);

// 发送消息
async function sendMessage() {
    const promptInput = document.getElementById('promptInput');
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    
    // 添加用户消息，包含选中的文件信息
    let userMessage = prompt;
    const selectedFiles = Object.keys(fileContext);
    if (selectedFiles.length > 0) {
        userMessage += '\n\n参考文件：\n' + selectedFiles.join('\n');
    }
    appendMessage('You', userMessage);
    promptInput.value = '';
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                prompt,
                fileContext: fileContext  // 发送文件内容和路径
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            appendMessage('Assistant', data.response);
        } else {
            appendMessage('Error', data.error);
        }
    } catch (error) {
        appendMessage('Error', '发送请求时发生错误');
    }
}

// 添加消息到聊天历史
function appendMessage(sender, content) {
    const chatHistory = document.getElementById('chatHistory');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender';
    senderDiv.textContent = sender;
    messageDiv.appendChild(senderDiv);
    
    if (sender === 'Assistant' && content.includes('```')) {
        // 处理包含代码块的消息
        const parts = content.split('```');
        parts.forEach((part, index) => {
            if (index % 2 === 0) {
                // 非代码部分 - 使用 marked 处理 Markdown
                if (part.trim()) {
                    const textDiv = document.createElement('div');
                    textDiv.className = 'content markdown-content';
                    textDiv.innerHTML = marked.parse(part.trim());
                    messageDiv.appendChild(textDiv);
                }
            } else {
                // 代码部分
                const codeBlock = createCodeBlock(part);
                messageDiv.appendChild(codeBlock);
            }
        });
    } else {
        // 普通消息也用 Markdown 渲染
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content markdown-content';
        contentDiv.innerHTML = marked.parse(content);
        messageDiv.appendChild(contentDiv);
    }
    
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 创建代码块
function createCodeBlock(codeContent) {
    const container = document.createElement('div');
    container.className = 'code-block';
    
    // 解析文件路径
    const lines = codeContent.trim().split('\n');
    let filePath = '未指定文件';
    let code = codeContent;
    
    if (lines[0].includes(':')) {
        filePath = lines[0].split(':')[1].trim();
        code = lines.slice(1).join('\n');
    }
    
    // 创建头部
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
        <span>${filePath}</span>
        <button class="btn btn-sm btn-primary" onclick="applyChanges('${filePath}', \`${code}\`)">
            Apply
        </button>
    `;
    container.appendChild(header);
    
    // 创建代码显示区域
    const pre = document.createElement('pre');
    const code_elem = document.createElement('code');
    code_elem.className = 'language-python';
    code_elem.textContent = code;
    pre.appendChild(code_elem);
    container.appendChild(pre);
    
    // 应用语法高亮
    Prism.highlightElement(code_elem);
    
    return container;
}

// 应用代码更改
async function applyChanges(filePath, code) {
    try {
        const response = await fetch('/api/apply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file_path: filePath, code })
        });
        
        const data = await response.json();
        if (response.ok) {
            appendMessage('System', data.message);
        } else {
            appendMessage('Error', data.error);
        }
    } catch (error) {
        appendMessage('Error', '应用更改时发生错误');
    }
}

// 添加代码预览功能
function showCodePreview(filepath, content) {
    const currentFile = document.getElementById('currentFile');
    const codePreview = document.getElementById('codePreview');
    
    currentFile.textContent = filepath;
    codePreview.textContent = content;
    
    // 根据文件扩展名设置语法高亮
    const extension = filepath.split('.').pop().toLowerCase();
    codePreview.className = `language-${getLanguageClass(extension)}`;
    
    // 应用语法高亮
    Prism.highlightElement(codePreview);
}

// 获取文件类型对应的语言类
function getLanguageClass(extension) {
    const languageMap = {
        'py': 'python',
        'js': 'javascript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        // 可以根据需要添加更多映射
    };
    return languageMap[extension] || 'plaintext';
}

// 添加页面加载时恢复工作目录的功能
document.addEventListener('DOMContentLoaded', async () => {
    // 保持原有的事件监听器...
    
    // 尝试恢复上次的工作目录
    try {
        const cachedDir = localStorage.getItem(CACHE_KEY.WORK_DIR);
        if (cachedDir) {
            const dirInfo = JSON.parse(cachedDir);
            // 显示上次的工作目录名称
            const fileList = document.getElementById('fileList');
            const placeholder = document.createElement('div');
            placeholder.className = 'cached-dir-info';
            placeholder.innerHTML = `
                <p>上次打开的工作目录: ${dirInfo.name}</p>
                <button class="btn btn-outline-primary btn-sm" onclick="document.getElementById('fileInput').click()">
                    重新选择目录
                </button>
            `;
            fileList.appendChild(placeholder);
        }
    } catch (e) {
        console.error('恢复工作目录失败:', e);
    }
});

// 添加相关样式
const additionalStyle = document.createElement('style');
additionalStyle.textContent = `
.cached-dir-info {
    padding: 15px;
    margin: 10px 0;
    background: #f8f9fa;
    border-radius: 4px;
    text-align: center;
}

.cached-dir-info p {
    margin-bottom: 10px;
    color: #666;
}
`;
document.head.appendChild(additionalStyle); 