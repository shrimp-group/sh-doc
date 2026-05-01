# 模板维护

模板是代码生成的核心，它定义了生成的代码结构和内容。您可以将模板理解为代码的"模具"，系统根据这个"模具"生成最终的代码文件。

## 什么是模板？

模板是一个包含特殊标记的文本文件，系统会根据数据库表结构和您的配置，将这些特殊标记替换为实际的内容，生成最终的代码文件。

### 模板的作用
- **定义代码结构**：决定生成什么类型的代码（实体类、Service、Controller等）
- **控制代码格式**：决定代码的排版、缩进、注释等
- **插入动态内容**：根据表结构动态生成字段、方法等

## 为什么需要模板？

通过模板，您可以：
1. **统一代码规范**：确保生成的代码符合团队规范
2. **提高开发效率**：避免重复编写相似的代码
3. **减少错误**：模板经过测试，生成的代码质量有保障
4. **灵活定制**：根据项目需求调整模板内容

## 如何创建模板？

### 1. 进入模板管理页面

登录系统后，在左侧菜单找到【模板管理】点击进入。

### 2. 添加新模板

点击【新增模板】按钮，填写以下信息：

#### 基本信息
- **模板编码**：模板的唯一标识，如 `entity_java`、`vue_page`
- **模板名称**：模板的显示名称，如 `Java实体类模板`
- **文件后缀**：生成文件的后缀，如 `.java`、`.vue`、`.xml`

#### 模板内容
在【模板内容】编辑框中编写模板代码。模板使用 FreeMarker 语法，支持以下功能：

##### 插入变量
```ftl
package ${table.packagePath};

public class ${table.entityName} {
    private ${column.javaType} ${column.fieldName};
}
```

##### 条件判断
```ftl
<#if column.primaryKey>
    @Id
</#if>
```

##### 循环遍历
```ftl
<#list table.fullColumns as column>
    // ${column.columnComment}
    private ${column.javaType} ${column.fieldName};
</#list>
```

### 3. 保存模板

填写完成后，点击【保存】按钮，模板就创建完成了。

## 模板变量说明

### 表信息变量
在模板中可以使用以下表级变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `tableName` | 数据库表名 | `user_info` |
| `tableComment` | 表注释 | `用户信息表` |
| `entityName` | 实体类名（驼峰命名） | `UserInfo` |
| `packagePath` | Java包路径 | `com.example.system.domain` |
| `moduleName` | 模块名 | `system` |

### 列信息变量
在循环中可以使用以下列级变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `columnName` | 数据库列名 | `user_name` |
| `columnComment` | 列注释 | `用户名` |
| `fieldName` | 字段名（驼峰命名） | `userName` |
| `javaType` | Java类型 | `String` |
| `primaryKey` | 是否主键 | `true`/`false` |

## 模板示例

### 1. 简单的Java实体类模板
```ftl
package ${table.packagePath};

import lombok.Data;

/**
 * ${table.tableComment}
 */
@Data
public class ${table.entityName} {
<#list table.fullColumns as column>
    /**
     * ${column.columnComment}
     */
    private ${column.javaType} ${column.fieldName};
</#list>
}
```

### 2. 带主键注解的实体类模板
```ftl
package ${table.packagePath};

import lombok.Data;
import javax.persistence.*;

/**
 * ${table.tableComment}
 */
@Data
@Entity
@Table(name = "${table.tableName}")
public class ${table.entityName} {
<#list table.fullColumns as column>
    /**
     * ${column.columnComment}
     */
    <#if column.primaryKey>
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    </#if>
    @Column(name = "${column.columnName}")
    private ${column.javaType} ${column.fieldName};
</#list>
}
```

### 3. Vue页面模板
```ftl
<template>
  <div class="app-container">
    <h2>${table.tableComment}管理</h2>
    
    <!-- 查询条件 -->
    <el-form :model="queryParams" ref="queryForm" :inline="true">
      <#list table.queryColumns as column>
      <el-form-item label="${column.columnComment}">
        <el-input v-model="queryParams.${column.fieldName}" />
      </el-form-item>
      </#list>
    </el-form>
  </div>
</template>
```

## 模板管理

### 查看模板列表
在模板管理页面，可以看到所有已创建的模板列表，显示模板编码、名称、文件后缀等信息。

### 编辑模板
点击模板列表中的【编辑】按钮，可以修改模板内容。修改后需要保存。

### 删除模板
点击【删除】按钮可以删除不再需要的模板。删除前请确认：
1. 该模板没有被任何项目使用
2. 删除后无法恢复

### 预览模板效果
系统支持模板预览功能，您可以选择一个数据表，预览模板生成的代码效果。

### 导入/导出模板
- **导出模板**：可以将模板导出为文件，用于备份或分享
- **导入模板**：可以从文件导入模板，快速创建新模板

## 模板调试技巧

### 1. 从简单开始
先创建一个简单的模板，确保能正常生成代码，再逐步添加复杂功能。

### 2. 使用变量预览
在模板编辑页面，可以使用【变量预览】功能查看可用的变量列表。

### 3. 分步测试
将复杂模板拆分成多个部分，分别测试每部分的功能。

### 4. 查看生成结果
生成代码后，仔细检查生成的文件，确认模板效果符合预期。

## 常用模板类型

### 后端模板
- **实体类模板**：生成Java实体类
- **Mapper接口模板**：生成MyBatis Mapper接口
- **Service模板**：生成Service接口和实现类
- **Controller模板**：生成REST控制器

### 前端模板
- **Vue页面模板**：生成Vue页面组件
- **API模板**：生成API调用代码
- **表单模板**：生成表单组件

### 配置文件模板
- **XML配置文件模板**：生成Spring配置文件
- **YAML配置文件模板**：生成应用配置文件

## 常见问题

### Q: 模板语法错误怎么办？
**解决方法：**
1. 检查FreeMarker语法是否正确
2. 检查变量名是否正确
3. 检查标签是否配对
4. 使用简单的模板测试

### Q: 如何创建复杂的模板？
**建议：**
1. 先参考现有的模板示例
2. 分步骤创建和测试
3. 使用条件判断和循环简化模板
4. 将重复部分提取为公共模板

### Q: 模板可以复用吗？
可以，一个模板可以用于多个项目或不同的表。

### Q: 如何更新模板？
直接编辑模板内容并保存即可，已生成的项目不会自动更新，需要重新生成代码。

### Q: 模板有版本管理吗？
系统记录模板的修改历史，您可以查看模板的修改记录。

## 最佳实践

### 1. 模板设计原则
- **单一职责**：每个模板只负责生成一种类型的文件
- **可配置性**：通过变量控制生成内容
- **可维护性**：模板代码清晰易读
- **可复用性**：模板适用于多种场景

### 2. 命名规范
- 模板编码使用小写字母和下划线
- 编码体现模板类型和用途
- 文件后缀准确反映文件类型

### 3. 错误处理
- 在模板中添加必要的空值判断
- 提供默认值避免空指针异常
- 使用注释说明模板的用法

### 4. 模板优化
- 避免过于复杂的模板逻辑
- 将公共部分提取为子模板
- 定期审查和优化模板

## 下一步

创建好模板后，您可以：
1. [创建项目](./project.md) - 将模板和数据源组织起来
2. [配置任务](./project.md#任务配置) - 定义生成规则
3. [生成代码](../usage.md) - 开始生成代码

---

**提示**：如果您是第一次创建模板，建议先从简单的模板开始，参考[模板示例](#模板示例)进行修改。