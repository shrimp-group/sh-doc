# Tool (工具模块)

> 通用工具库 - 提供日常开发中常用的工具类和方法

## 概述

`sh-tool` 是 sh-framework 的基础工具模块，封装了开发过程中常用的工具类和方法。它提供了字符串处理、日期时间、JSON 操作、加密解密、二维码生成、反射解析、系统状态采集等实用功能，是其他模块和业务项目的基础依赖。

## 模块结构

```
com.wkclz.tool
├── utils        # 通用工具类（20 个）
├── tools        # 加密与校验工具类（7 个）
└── bean         # 工具模块数据实体（3 个）
```

### 依赖清单（pom.xml）

- `lombok`：简化实体类样板代码
- `spring-boot-starter-logging`：日志框架（SLF4J/Logback）
- `commons-lang3`、`commons-collections4`：Apache 通用工具库
- `spring-beans`：Bean 属性复制（BeanUtils）
- `guava`：Google 通用工具库
- `fastjson2`：JSON 序列化与解析
- `zxing`（core、javase）：二维码 / 条形码生成
- `hutool-all`：Hutool 工具库（RSA 实现依赖）
- `rhino`：JavaScript 执行引擎

## 核心功能

### 1. 字符串工具 (StringUtil / StringFormat)
- 下划线转驼峰、驼峰转下划线、首字母大小写转换
- 字符串转 Map、指定内容转小写、移除特殊字符
- `StringFormat`：`{}` 顺序占位符与 `${var}` 命名变量两种模板，支持 `${var}[内容]` 条件渲染

### 2. 日期时间工具 (DateUtil)
- 字符串转日期（`yyyy-MM-dd` / `yyyy-MM-dd HH:mm:ss`）
- 获取当天开始时间
- 计算时间差并格式化为中文（支持 Date / Long / LocalDateTime）

### 3. JSON 工具 (JsonUtil)
- 读取 JSON 文件并反序列化为对象
- 对象序列化写入 JSON 文件（自动格式化）

### 4. 加密工具类（tools 包）
- **Md5Tool**：MD5 加密（32 位 / 16 位，大小写），MD5 校验
- **ShaTool**：SHA-1、SHA-256、SHA-384、SHA-512
- **AesTool**：AES 对称加密解密（128 / 192 / 256 位）
- **DesTool**：DES 对称加密解密（56 位）
- **RsaTool**：RSA 密钥对生成、公私钥加解密、密钥转换
- **Base64Tool**：Base64 编码解码

### 5. 校验工具 (RegularTool)
- 常用正则验证：正整数、字母、合法字符、日期、邮箱、手机号、域名、IP、URL
- 双字节字符判断、自定义正则匹配 / 查找 / 替换

### 6. 二维码工具 (QrCodeUtil)
- 生成二维码 / 条形码 Base64
- 生成小程序二维码 Base64
- 图片转 Base64、保存为文件

### 7. 文件与压缩工具 (FileUtil / CompressUtil)
- 文件读写、删除、遍历目录、文件大小格式化、临时目录管理
- ZIP 压缩 / 解压（解压内置 Zip Slip 路径穿越防护）

### 8. Bean 与反射工具 (BeanUtil / ClassUtil / ClassTypeHelper)
- Bean 属性复制（含忽略 null 复制）、Map 与 Bean 转换、JavaField 字段映射获取
- 反射：包扫描、按接口查找实现类、获取类方法
- 类型解析：简单 / 复杂类型判断、泛型解析（`GenericTypeInfo`）、字段结构扫描（`FieldInfo`）

### 9. 网络工具 (NetworkUtil)
- 获取本机 IPv4 地址（过滤 lo / docker 接口）
- 获取全部网卡 IP 信息
- 内网地址判断（支持 IPv4 / IPv6，含 ULA 唯一本地地址）

### 10. 其他工具类
- **MapUtil**：Map 与对象互转、key 驼峰化、排序、URL 拼接等
- **PropertiesUtil**：Properties 文件读写、转换 Map / 对象
- **IntegerUtil**：逗号分隔字符串转 Integer / Long 列表
- **SnowflakeIdWorker**：分布式唯一 ID 生成（雪花算法）
- **SecretUtil**：验证码、密码加解密、UUID、AES 密钥、数字转 32 进制
- **JsUtil**：基于 Rhino 的 JavaScript 执行引擎
- **ServerStateUtil**：基于 JMX 的系统状态采集（CPU / 内存 / 线程 / GC / 磁盘等）
- **CheckPwdUtil**：密码强度评分校验
- **ValidateCode**：图形验证码生成（文本 + 图片）

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
        String ageDiff = DateUtil.getTimeDifference(birthDate);
        
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
        // 序列化可使用模块依赖的 fastjson2
        return QrCodeUtil.createBase64QrCode(JSON.toJSONString(user));
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

// 指定内容转小写（如 SQL 排序关键字）
StringUtil.check2LowerCase("a.merchantId ASC", "ASC"); // "a.merchantId asc"

// 移除特殊字符（Tab、换行等合并为空格）
StringUtil.removeSpecialCharacters("a\tb\nc"); // "a b c"
```

### StringFormat 字符串模板
```java
// {} 顺序占位符，按顺序替换
StringFormat.of("Hello, {}! You have {} messages.", "Alice", 5);
// => "Hello, Alice! You have 5 messages."

// ${var} 命名变量
Map<String, Object> params = new HashMap<>();
params.put("name", "Alice");
params.put("age", 30);
StringFormat.of("Name: ${name}, Age: ${age}", params);
// => "Name: Alice, Age: 30"

// 条件渲染：${var}[内容]，var 为空时 [] 内的内容不渲染
StringFormat.of("${name}[Name: ${name}]${age}[, Age: ${age}]", params);
// => "Name: Alice, Age: 30"

// 参数不足时保留 {}，参数多余时忽略
StringFormat.of("A: {}, B: {}, C: {}", "X"); // => "A: X, B: {}, C: {}"
```

### DateUtil 日期工具
```java
// 字符串转日期（yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss）
Date date = DateUtil.getDate("2023-10-01");
Date dateTime = DateUtil.getDate("2023-10-01 14:30:00");

// 获取当天开始时间
Date todayStart = DateUtil.getDayBegin();

// 计算时间差（支持 Date / Long / LocalDateTime，可选 future 参数）
String diff = DateUtil.getTimeDifference(pastDate, nowDate);
// 输出：30天 4时 30分 15秒
```

### JsonUtil JSON 工具
```java
// 读取 JSON 文件并反序列化
User user = JsonUtil.readJson("/path/to/user.json", User.class);

// 对象序列化写入 JSON 文件（自动格式化）
JsonUtil.writeJson("/path/to/user.json", user);
```

### 加密工具使用（tools 包）
```java
// MD5 加密
String md5 = Md5Tool.md5lowerCase32("password");   // 32位小写
String md516 = Md5Tool.md5lowerCase16("password"); // 16位小写
String md5Upper = Md5Tool.md5UpperCase32("password");
boolean isValid = Md5Tool.isMd5(md5); // true

// SHA 加密
String sha256 = ShaTool.sha256("password");
String sha1 = ShaTool.sha1("password");
String sha512 = ShaTool.sha512("password");
String sha = ShaTool.sha("password", "SHA-256"); // 指定算法（SHA-1/256/384/512）

// AES 加密解密（默认 128 位，支持 KEY_192 / KEY_256）
String encrypted = AesTool.encrypt("data", "key");
String decrypted = AesTool.decrypt(encrypted, "key");

// DES 加密解密
String encrypted = DesTool.encrypt("data", "key");
String decrypted = DesTool.decrypt(encrypted, "key");

// RSA 密钥对生成与加解密
String[] keys = RsaTool.genKeyPair(); // [0] 私钥, [1] 公钥，默认 1024 位
String[] keys4096 = RsaTool.genKeyPair(4096); // 支持 1024 / 2048 / 4096

String encByPublic = RsaTool.encryptByPublicKey("data", keys[1]);
String decByPrivate = RsaTool.decryptByPrivateKey(encByPublic, keys[0]);

String encByPrivate = RsaTool.encryptByPrivateKey("data", keys[0]);
String decByPublic = RsaTool.decryptByPublicKey(encByPrivate, keys[1]);

// 密钥字符串转 Key 对象（支持 PEM 格式私钥）
PublicKey publicKey = rsaTool.convertToPublicKey(keys[1]);
PrivateKey privateKey = RsaTool.convertToPrivateKey(keys[0]);

// Base64 编码解码
String base64 = Base64Tool.base64Encode("data");
String str = Base64Tool.base64Decode2String(base64);
byte[] bytes = Base64Tool.base64Decode(base64);
```

### RegularTool 正则校验
```java
RegularTool.isPositiveInteger("123"); // true
RegularTool.isLetter("abc");          // true
RegularTool.isLegalChar("user_1");    // true（数字、字母、下划线）
RegularTool.isDate("2023-10-01");     // true
RegularTool.isEmail("a@b.com");       // true
RegularTool.isMobile("13800138000");  // true
RegularTool.isDomain("www.wkclz.com");// true
RegularTool.isIp("127.0.0.1");        // true
RegularTool.isUrl("https://www.wkclz.com"); // true
RegularTool.haveDoubleByte("中文abc"); // true

// 自定义正则匹配 / 查找 / 替换
RegularTool.match(str, "^\\d+$");
RegularTool.find(str, "\\d+");        // 返回匹配结果列表
RegularTool.replaceAll(str, "\\s+", ""); // 正则替换
```

### 二维码工具 (QrCodeUtil)
```java
// 生成二维码Base64
String qrCode = QrCodeUtil.createBase64QrCode("https://example.com");

// 生成条形码Base64（CODE_39，600x200）
String barCode = QrCodeUtil.createBase64BarCode("1234567890");

// 小程序二维码（拉取 URL 图片转 Base64）
String wxCode = QrCodeUtil.createBase64QrCodeWxapp("https://example.com/wx.png");

// 生成图片对象（支持自定义格式与尺寸）
BufferedImage qrImage = QrCodeUtil.createQrCode(
    "content", BarcodeFormat.QR_CODE, 400, 400
);

// 图片转 Base64 / 保存为文件
String base64 = QrCodeUtil.bufferedImage2Base64(qrImage);
File file = QrCodeUtil.bufferedImage2File(qrImage, "qrcode.png");
```

### BeanUtil Bean 工具
```java
// Bean 复制（cpAll 复制全部属性，cpNotNull 忽略 null 属性）
User target = BeanUtil.cp(source, User.class);
User target2 = BeanUtil.cpAll(source, target);
User target3 = BeanUtil.cpNotNull(source, target);
List<User> list = BeanUtil.cp(sourceList, User.class);

// 移除对象中值为空字符串的属性
BeanUtil.removeBlank(obj);

// 获取对象中有值的 getter 方法列表
List<Method> valuedMethods = BeanUtil.getValuedList(obj);

// 获取业务实体的字段映射（含父类字段，缓存实现）
Map<String, JavaField> javaFields = BeanUtil.getJavaField(User.class);
String fieldName = javaFields.get("name").getFieldName();
Method getter = javaFields.get("name").getGetter();

// 找出 Bean 中为 null 的属性名
String[] nullNames = BeanUtil.getNullPropertyNames(source);
```

### ClassUtil 反射工具
```java
// 获取类中指定名称的方法（含父类递归查找）
Method method = ClassUtil.getModelMethod(User.class, "getName");

// 扫描包下所有类（支持 file 与 jar 协议）
Set<Class<?>> classes = ClassUtil.getClasses("com.wkclz.tool");

// 从类集合中查找指定接口的实现类
Set<Class<?>> impls = ClassUtil.getByInterface(SomeInterface.class, classes);
```

### ClassTypeHelper 类型解析工具
```java
// 简单类型判断（基本类型、包装类、String、Date、Number 等）
ClassTypeHelper.isSimpleType(User.class);  // false
ClassTypeHelper.isComplexType(User.class); // true

// 提取泛型参数类型名
List<String> genericTypes = ClassTypeHelper.extractGenericTypes(field.getGenericType());

// 递归解析泛型类型为 GenericTypeInfo（rawType + typeArgs 树）
GenericTypeInfo info = ClassTypeHelper.parseGenericType(field.getGenericType());

// 从泛型类型解析出实际业务类（自动穿透 R<PageData<T>>、List<T>、Map<K,V> 等容器）
Class<?> clazz = ClassTypeHelper.resolveActualClass(type);

// 递归扫描类字段结构（返回 FieldInfo 树，支持循环引用检测与深度限制）
List<ClassTypeHelper.FieldInfo> fields = ClassTypeHelper.scanClassFields(
    User.class, null, 0, new HashSet<>());
// 带注解处理版本（@Schema / @NotNull / @NotBlank）
List<ClassTypeHelper.FieldInfo> fields2 = ClassTypeHelper.scanClassFields(
    User.class, null, 0, new HashSet<>(), true);
```

### MapUtil Map 工具
```java
// 对象转 Map（含父类字段）
LinkedHashMap<String, Object> map = MapUtil.obj2Map(obj);
List<LinkedHashMap<String, Object>> mapList = MapUtil.obj2MapList(obj1, obj2);

// Map / MapList 转对象
User user = MapUtil.map2Obj(map, User.class);
List<User> users = MapUtil.map2ObjList(mapList, User.class);

// JSON 字符串转 Map
Map<String, Object> map = MapUtil.jsonString2Map(jsonStr);

// Map key 下划线转驼峰（普通 Map / LinkedHashMap）
Map newMap = MapUtil.toReplaceMapKeyLow(oldMap);

// 移除空白值、拼接 URL 参数、Properties 互转、按 key 排序
MapUtil.removeBlank(map);
String urlStr = MapUtil.map2UrlString(map); // "a=1&b=2"
Map<String, String> m = MapUtil.prop2Map(prop);
Properties p = MapUtil.map2Prop(map);
Map<String, String> sorted = MapUtil.sortMapByKey(map);
```

### FileUtil 文件工具
```java
// 临时目录（user.dir/tmp[/customPath]）
String tmpPath = FileUtil.getTempPath();
File tmpFile = FileUtil.getTempPathFile("images");

// 读取文件（String 或 File）
String content = FileUtil.readFile("/path/to/file.txt");

// 写入文件（文件已存在时抛异常，不覆盖）
File file = FileUtil.writeFile("/path/to/new.txt", "content");

// 删除文件（支持递归删除目录）
FileUtil.delFile("/path/to/file.txt");

// 递归获取目录下所有文件绝对路径
List<String> files = FileUtil.getFileList(null, "/path/to/dir");

// 文件大小格式化
FileUtil.formatFileSize(1536); // "1.50K"
```

### CompressUtil 压缩工具
```java
// 压缩为 ZIP（默认保留目录结构）
CompressUtil.zip("/path/to/srcDir", outputStream);

// 压缩（可指定是否保留目录结构）
CompressUtil.zip("/path/to/srcDir", outputStream, true);

// 解压 ZIP（内置 Zip Slip 防护，入口文件超出目标目录时抛出异常）
CompressUtil.unZip(new File("/path/to/src.zip"), "/path/to/dest");
```

### NetworkUtil 网络工具
```java
// 获取本机 IPv4 地址（过滤 lo / docker 网卡）
String ip = NetworkUtil.getServerIp();

// 获取全部网卡 IP 信息列表（名称、地址、可达性、回环/链路本地标记等）
List<Map<String, Object>> ips = NetworkUtil.getServerIps();

// 判断是否为内网地址（IPv4 私有/链路本地，IPv6 链路本地/ULA）
boolean inner = NetworkUtil.isInnerAddress("192.168.1.1"); // true
```

### PropertiesUtil 属性文件工具
```java
// Properties 转 Map
Map<String, Object> map = PropertiesUtil.prop2Map(prop);

// 文件转 Properties / Map
Properties prop = PropertiesUtil.propFile2Prop("config.properties");
Map<String, Object> map = PropertiesUtil.propFile2Map("config.properties");

// 读取 / 写入 Properties 文件（写入自动按 key 排序）
Properties props = PropertiesUtil.readProp("config.properties");
PropertiesUtil.writeProp("config.properties", newProps);

// Properties 转对象
Object obj = PropertiesUtil.prop2Object(prop, User.class);
```

### IntegerUtil 整数工具
```java
// 逗号（支持中英文、分号、竖线）分隔字符串转 Integer / Long 列表
List<Integer> ids = IntegerUtil.str2IntegerList("1,2,3，4;5|6");
List<Long> ids = IntegerUtil.str2LongList("1,2,3");
```

### SnowflakeIdWorker 分布式ID
```java
// 雪花算法：41位时间戳 + 5位数据中心 + 5位机器 + 12位序列
SnowflakeIdWorker idWorker = new SnowflakeIdWorker(0, 0); // workerId(0~31), datacenterId(0~31)
long id = idWorker.nextId(); // 线程安全，时钟回拨时抛出异常
```

### SecretUtil 密钥工具
```java
// 获取 6 位随机验证码
String code = SecretUtil.getCapchaCode();

// 密码加密 / 解密（AES，推荐显式传入 salt）
String encrypted = SecretUtil.getEncryptPassword("password", salt);
String decrypted = SecretUtil.getDecryptPassword(encrypted, salt);

// 无 salt 版本（使用默认 GENERAL_SALT，已废弃 / 不建议）
String encrypted = SecretUtil.getEncryptPassword("password");

// Java UUID（去横线、小写）
String uuid = SecretUtil.getJavaUuid();

// AES 密钥（UUID + 时间戳 MD5）
String key = SecretUtil.getKey();

// 数字转 32 进制字符串
String s = SecretUtil.digits32(123456789L);
```

### JsUtil JavaScript 执行
```java
// 执行 JavaScript 函数（参数支持 String / JSONObject / Map）
String script = "function test(param) { return 'result:' + param; }";
String result = JsUtil.exec(script, "hello");

// 基于 Rhino 引擎，函数按脚本 MD5 缓存
```

### ServerStateUtil 系统状态采集
```java
// 基于 JMX 采集系统状态，返回 SystemBaseInfo 各分区数据
SystemBaseInfo.ClassLoading cl = ServerStateUtil.getClassLoadingMXBean();
SystemBaseInfo.Compilation compilation = ServerStateUtil.getCompilationMXBean();
SystemBaseInfo.OperatingSystem os = ServerStateUtil.getOperatingSystemMXBean();
SystemBaseInfo.PlatformMBeanServer mbean = ServerStateUtil.getPlatformMBeanServer();
SystemBaseInfo.Runtime runtime = ServerStateUtil.getRuntimeMXBean();
SystemBaseInfo.Thread thread = ServerStateUtil.getThreadMXBean();
SystemBaseInfo.Memory memory = ServerStateUtil.getMemoryMXBean();
List<SystemBaseInfo.MemoryManager> managers = ServerStateUtil.getMemoryManagerMXBeans();
List<SystemBaseInfo.GarbageCollector> gcs = ServerStateUtil.getGarbageCollectorMXBeans();
List<SystemBaseInfo.MemoryPool> pools = ServerStateUtil.getMemoryPoolMXBeans();
List<SystemBaseInfo.Disk> disks = ServerStateUtil.getDisk(); // 磁盘分区信息
```

### CheckPwdUtil 密码强度校验
```java
// 高强度密码评分（0~100），不满足最低要求时返回 0
int score = CheckPwdUtil.checkPwdTopLevel("Password123!");

// 中低强度校验：6~18 位且包含两种以上元素时返回 100，否则 0
int result = CheckPwdUtil.checkPwd("abc123");

// 弱密码提示常量
String warn = CheckPwdUtil.PWD_IS_WEAK_WARN;
```

### ValidateCode 图形验证码
```java
// 生成验证码文本（类型：数字、字母、混合等 7 种）
String code = ValidateCode.generateTextCode(ValidateCode.TYPE_ALL_MIXED, 4, null);
// 类型常量：TYPE_NUM_ONLY / TYPE_LETTER_ONLY / TYPE_ALL_MIXED /
//          TYPE_NUM_UPPER / TYPE_NUM_LOWER / TYPE_UPPER_ONLY / TYPE_LOWER_ONLY

// 根据已有文本生成验证码图片（支持干扰线、随机位置、自定义颜色）
BufferedImage image = ValidateCode.generateImageCode(code, 120, 40, 5, true, null, null, null);

// 一步生成图片验证码
BufferedImage image2 = ValidateCode.generateImageCode(
    ValidateCode.TYPE_ALL_MIXED, 4, null, 120, 40, 5, true, null, null, null);
```

### bean 数据实体
| 实体 | 说明 | 主要属性 |
|------|------|----------|
| **JavaField** | 业务实体字段映射 | fieldName、columnName、field、getter、setter、clazz |
| **GenericTypeInfo** | 泛型类型信息（树形） | rawType（完整类名）、typeArgs（子泛型列表） |
| **SystemBaseInfo** | 系统信息聚合 | disks、classLoading、compilation、operatingSystem、platformMBeanServer、runtime、thread、memory、memoryManagers、garbageCollectors、memoryPools |

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
- `FileUtil.writeFile` 对已存在文件直接抛出异常，不会覆盖

### Q4: 日期转换异常？
- 检查日期字符串格式
- 确保使用正确的日期格式：yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss
- 时区问题：确保服务器时区设置正确

### Q5: 解压 ZIP 报 "Zip entry outside target dir"？
- 目标压缩包中存在路径穿越条目（如 `../`），为安全防护拦截
- 仅解压可信来源的压缩包

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
- ✅ 丰富的常用工具类（utils 20 个、tools 7 个、bean 3 个）
- ✅ 统一的API设计
- ✅ 经过测试的可靠实现
- ✅ 良好的性能表现
- ✅ 内置安全防护（ZIP 解压路径穿越防护、密码强度校验等）

通过使用 `sh-tool`，开发者可以：
- 减少重复代码编写
- 提高开发效率
- 保证代码质量
- 统一开发规范

开始使用 `sh-tool`，让日常开发更高效！
