import cv2

def calculate_image_similarity(img1, img2):
    """
    计算两张图像的相似性，返回一个相似度评分（0-1之间）。
    
    参数:
        img1 (numpy.ndarray): 第一张图像，格式为 OpenCV 读取的图像格式。
        img2 (numpy.ndarray): 第二张图像，格式为 OpenCV 读取的图像格式。
        
    返回:
        float: 相似度评分（0-1之间）。
    """
    # 检查图像尺寸是否一致
    if img1.shape != img2.shape:
        # 统一调整为较小的尺寸
        min_height = min(img1.shape[0], img2.shape[0])
        min_width = min(img1.shape[1], img2.shape[1])
        img1 = cv2.resize(img1, (min_width, min_height))
        img2 = cv2.resize(img2, (min_width, min_height))
    # 将图像转换为灰度图
    gray_img1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray_img2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    # 计算图像的直方图
    hist_img1 = cv2.calcHist([gray_img1], [0], None, [256], [0, 256])
    hist_img2 = cv2.calcHist([gray_img2], [0], None, [256], [0, 256])
    # 归一化直方图
    cv2.normalize(hist_img1, hist_img1)
    cv2.normalize(hist_img2, hist_img2)
    # 计算相似度
    similarity = cv2.compareHist(hist_img1, hist_img2, cv2.HISTCMP_CORREL)
    return similarity

# 示例图像（你可以替换为你的实际图像路径）
img1 = cv2.imread('path/to/image1.jpg')
img2 = cv2.imread('path/to/image2.jpg')

if img1 is None or img2 is None:
    print("无法读取图像，请检查文件路径。")
else:
    similarity_score = calculate_image_similarity(img1, img2)
    print(f"图像相似度评分: {similarity_score}")