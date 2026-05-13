# Tool (工具模块)

> 通用工具库 - 提供日常开发中常用的工具类和方法

## 概述

`sh-tool` 是 sh-framework 的基础工具模块，封装了开发过程中常用的工具类和方法。它提供了字符串处理、日期时间、JSON 操作、加密解密、二维码生成等实用功能，是其他模块和业务项目的基础依赖。

## 核心功能

### 1. 字符串工具 (StringUtil)
- 下划线转驼峰、驼峰转下划线
- 首字母大小写转换
- 字符串转Map、移除特殊字符

### 2. 日期时间工具 (DateUtil)
- 字符串转日期
- 获取当天开始时间
- 计算时间差并格式化为中文

### 3. JSON 工具 (JsonUtil)
- 读取和写入JSON文件
- JSON字符串格式化

### 4. 加密工具类
- **Md5Tool**：MD5加密（32位/16位，大小写）
- **ShaTool**：SHA-1、SHA-256、SHA-512加密
- **AesTool**：AES加密解密
- **DesTool**：DES加密解密
- **RsaTool**：RSA非对称加密、数字签名

### 5. 二维码工具 (QrCodeUtil)
- 生成二维码Base64
- 生成条形码Base64
- 生成小程序二维码
- 保存二维码为文件

### 6. 文件工具 (FileUtil)
- 文件读写操作
- 字节数组读写

### 7. 压缩工具 (CompressUtil)
- 文件压缩解压缩
- GZIP字符串压缩解压缩

### 8. Bean 工具 (BeanUtil)
- 对象属性复制
- Map与Bean互相转换
- 字段值获取和设置

### 9. 类工具 (ClassUtil)
- 反射操作：获取字段、方法
- 实例化对象、调用方法

### 10. 网络工具 (NetworkUtil)
- 获取本机IP、MAC地址
- 检查端口可用性
- HTTP请求发送

### 11. 正则工具 (RegularTool)
- 常用正则验证：手机号、邮箱、身份证、URL、IP
- 自定义正则匹配

### 12. 其他工具类
- **EnumUtil**：枚举操作工具
- **PropertiesUtil**：属性文件操作
- **SnowflakeIdWorker**：分布式唯一ID生成
- **MapUtil**：Map操作工具
- **IntegerUtil**：整数操作工具
- **SecretUtil**：密钥生成工具
- **JsUtil**：JavaScript执行引擎
- **ServerStateUtil**：服务器状态监控
- **CheckPwdUtil**：密码强度检查
- **ValidateCode**：验证码生成
- **Base64Tool**：Base64编码解码
- **AreaUtil**：地区编码工具

## 使用方法

### 1. 添加依赖
```xml
<dependencies>
    <dependency>
        <groupId>com.wkclz.framework</groupId>
        <artifactId>sh-tool</artifactId>
    </dependency>
</dependencies>
```

### 2. 基本使用示例
```java
import com.wkclz.tool.utils.StringUtil;
import com.wkclz.tool.utils.DateUtil;
import com.wkclz.tool.tools.Md5Tool;

public class ExampleService {
    public void processData() {
        // 字符串处理
        String camelName = StringUtil.underlineToCamel("user_name_info");
        
        // 日期处理
        Date birthDate = DateUtil.getDate("1990-01-01");
        String ageDiff = DateUtil.getTimeDifference(birthDate, new Date());
        
        // 加密处理
        String encrypted = Md5Tool.md5lowerCase32("password");
    }
}
```

### 3. Spring Boot 中使用
```java
@Service
public class UserService {
    public String generateQrCode(Long userId) {
        User user = getUserById(userId);
        return QrCodeUtil.createBase64QrCode(JsonUtil.toJson(user));
    }
    
    public boolean verifyPassword(String input, String storedHash) {
        return Md5Tool.md5lowerCase32(input).equals(storedHash);
    }
}
```

## 工具类详解

### StringUtil 字符串工具
```java
// 下划线转驼峰
StringUtil.underlineToCamel("user_name"); // "userName"

// 驼峰转下划线  
StringUtil.camelToUnderline("userName"); // "user_name"

// 首字母转换
StringUtil.firstChatToLowerCase("UserName"); // "userName"
StringUtil.firstChatToUpperCase("userName"); // "UserName"

// 字符串转Map
String str = "name=张三&age=20";
Map<String, String> map = StringUtil.strVar2Map(str, "&");
```

### DateUtil 日期工具
```java
// 字符串转日期
Date date = DateUtil.getDate("2023-10-01");
Date dateTime = DateUtil.getDate("2023-10-01 14:30:00");

// 获取当天开始时间
Date todayStart = DateUtil.getDayBegin();

// 计算时间差
String diff = DateUtil.getTimeDifference(pastDate, nowDate);
// 输出：30天 4时 30分 15秒
```

### 加密工具使用
```java
// MD5加密
String md5 = Md5Tool.md5lowerCase32("password");
boolean isValid = Md5Tool.isMd5(md5); // true

// SHA加密
String sha256 = ShaTool.sha256("password");

// AES加密解密
String encrypted = AesTool.encrypt("data", "16byte-key-here");
String decrypted = AesTool.decrypt(encrypted, "16byte-key-here");

// RSA加密签名
Map<String, String> keys = RsaTool.createKeys();
String encrypted = RsaTool.publicEncrypt("data", keys.get("publicKey"));
String signature = RsaTool.sign("data", keys.get("privateKey"));
boolean verified = RsaTool.verify("data", keys.get("publicKey"), signature);
```

### 二维码工具
```java
// 生成二维码Base64
String qrCode = QrCodeUtil.createBase64QrCode("https://example.com");

// 生成条形码
String barCode = QrCodeUtil.createBase64BarCode("1234567890");

// 生成图片对象
BufferedImage qrImage = QrCodeUtil.createQrCode(
    "content", BarcodeFormat.QR_CODE, 400, 400
);

// 保存为文件
File file = QrCodeUtil.bufferedImage2File(qrImage, "qrcode.png");
```

## 最佳实践

### 1. 安全性建议
```java
// 不推荐：直接MD5存储密码
String hash = Md5Tool.md5lowerCase32(password);

// 推荐：加盐的SHA-256
String salt = generateSalt();
String hash = ShaTool.sha256(password + salt);

// 推荐：使用专业密码哈希（如BCrypt）
// 可使用Spring Security的BCryptPasswordEncoder
```

### 2. 错误处理
```java
try {
    String content = FileUtil.readFile("/path/to/file.txt");
    User user = JsonUtil.readJson("/path/to/user.json", User.class);
    String encrypted = AesTool.encrypt("data", "valid-key");
} catch (RuntimeException e) {
    logger.error("操作失败", e);
    // 业务处理
}
```

### 3. 性能优化
- **MD5**：适合快速哈希，安全性较低
- **SHA-256**：安全性更高，速度稍慢
- **AES**：对称加密，速度快
- **RSA**：非对称加密，速度慢，适合小数据

## 常见问题

### Q1: 如何选择加密算法？
- **密码存储**：SHA-256 + 盐，或专业密码哈希
- **数据传输**：AES对称加密
- **数字签名**：RSA非对称加密
- **快速哈希**：MD5（仅限非敏感数据）

### Q2: 二维码生成失败？
- 检查内容长度：过长的内容可能无法生成
- 检查图片尺寸：过小的尺寸可能无法扫描
- 检查内容格式：确保是有效的URL或文本

### Q3: 文件操作权限问题？
- 确保有文件读写权限
- 检查文件路径是否正确
- 使用绝对路径避免歧义

### Q4: 日期转换异常？
- 检查日期字符串格式
- 确保使用正确的日期格式：yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss
- 时区问题：确保服务器时区设置正确

## 扩展指南

### 1. 添加自定义工具类
```java
package com.wkclz.tool.utils;

public class CustomStringUtil {
    // 隐藏手机号中间四位
    public static String hidePhone(String phone) {
        if (phone == null || phone.length() != 11) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(7);
    }
    
    // 隐藏邮箱部分信息
    public static String hideEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int atIndex = email.indexOf("@");
        String prefix = email.substring(0, atIndex);
        String suffix = email.substring(atIndex);
        
        if (prefix.length() <= 2) return "***" + suffix;
        return prefix.substring(0, 2) + "***" + suffix;
    }
}
```

### 2. 工具类设计原则
1. **静态方法**：工具类通常提供静态方法
2. **无状态**：工具类不应该保存状态
3. **线程安全**：确保方法线程安全
4. **良好命名**：方法名清晰表达功能
5. **完整文档**：添加JavaDoc注释
6. **单元测试**：为工具类编写测试

## 总结

`sh-tool` 提供了：
- ✅ 丰富的常用工具类
- ✅ 统一的API设计
- ✅ 经过测试的可靠实现
- ✅ 良好的性能表现

通过使用 `sh-tool`，开发者可以：
- 减少重复代码编写
- 提高开发效率
- 保证代码质量
- 统一开发规范

开始使用 `sh-tool`，让日常开发更高效！