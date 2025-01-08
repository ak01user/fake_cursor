from flask import Flask, render_template, request, jsonify
import os
from typing import Dict
import requests

app = Flask(__name__)

class CodeGenerator:
    def __init__(self):
        self.api_url = "http://127.0.0.1:11434/api/generate"
        
    def generate_code(self, prompt: str, file_context: Dict[str, str] = None) -> str:
        """使用本地 deepseek-coder-v2 模型生成代码"""
        system_prompt = """你是一个专业的程序员助手。请根据用户的要求生成或修改代码。
        如果用户没有明确自己的需求，请你结合自己的经验，给出最优的解决方案。
        如果要修改现有文件，请明确指出修改的位置和内容。
        如果是新建文件，请提供完整的文件内容。
        在回复中，请使用 ```language:filepath 的格式来标识代码块，以便系统知道要修改哪个文件。"""
        
        context = ""
        if file_context:
            context = "参考文件内容：\n"
            for file_path, content in file_context.items():
                context += f"\n文件 {file_path}:\n```{file_path.split('.')[-1]}:{file_path}\n{content}\n```\n"
        
        try:
            response = requests.post(
                self.api_url,
                json={
                    "model": "deepseek-coder-v2",
                    "prompt": f"{system_prompt}\n\n{context}\n用户请求：{prompt}",
                    "stream": False
                }
            )
            response.raise_for_status()
            return response.json()["response"]
        except Exception as e:
            return f"生成代码时发生错误：{str(e)}"
    
    def apply_changes(self, file_path: str, new_content: str) -> bool:
        """将生成的代码应用到文件中"""
        try:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        except Exception as e:
            print(f"应用更改时发生错误：{str(e)}")
            return False

generator = CodeGenerator()
file_context = {}

@app.route('/')
def index():
    return render_template('code_assistant.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '没有文件被上传'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
        
    try:
        content = file.read().decode('utf-8')
        file_context[file.filename] = content
        return jsonify({
            'message': f'文件 {file.filename} 上传成功',
            'filename': file.filename
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt')
    file_context = data.get('fileContext', {})
    
    if not prompt:
        return jsonify({'error': '提示不能为空'}), 400
    
    # 构建包含文件路径的上下文
    context_with_paths = {}
    for file_path, content in file_context.items():
        context_with_paths[file_path] = content
    
    response = generator.generate_code(prompt, context_with_paths)
    return jsonify({'response': response})

@app.route('/api/apply', methods=['POST'])
def apply_changes():
    data = request.json
    file_path = data.get('file_path')
    code = data.get('code')
    if not file_path or not code:
        return jsonify({'error': '文件路径和代码不能为空'}), 400
        
    success = generator.apply_changes(file_path, code)
    if success:
        return jsonify({'message': f'更改已成功应用到 {file_path}'})
    else:
        return jsonify({'error': f'应用更改到 {file_path} 失败'}), 500

if __name__ == '__main__':
    app.run(debug=True) 