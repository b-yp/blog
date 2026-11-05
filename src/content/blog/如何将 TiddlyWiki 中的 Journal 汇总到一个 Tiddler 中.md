---
title: '如何将 TiddlyWiki 中的 Journal 汇总到一个 Tiddler 中'
description: '利用 TiddlyWiki 的 Filter 与模板复用机制，实现每日日记到月汇总、年汇总的全动态串联展示，支持隐私过滤与最新条目置顶。'
pubDate: '2025-12-19'
---

作为 Logseq 的长期用户，我非常习惯它将每日日志（Journals）以纵向流式串联的方式展示——也就是类似“故事河”（Story River）的连续阅读体验。有趣的是，Logseq 故事河的灵感本就源自 TiddlyWiki；而当我在 TiddlyWiki 中写日记时，默认每天都会生成一个独立的 Tiddler，日积月累后显得零散割裂，无法一口气顺畅浏览。

为了找回这种如流水般的阅读感，我借助 TiddlyWiki 强大的过滤器（Filter）和嵌入（Transclusion）机制，把碎片化的日记串成一条流动的“故事河”。

本文将介绍如何通过简单的层级结构与 Filter 机制，实现 **每日日记 → 月汇总 → 年汇总** 的全动态展示，同时支持私密条目过滤与“最新条目在前”的排序，最后通过模板化实现零心智负担的代码复用。

---

## 1. 基础设置

- 在 **Control Panel → Info → Basics** 中，将 **Title of new journal tiddlers** 设置为 `YYYY-MM-DD` 或 `YYYY年MM月DD日`（便于筛选排序，也更符合习惯）。
- 新建日记时自动添加标签 `Journal`。
- 如需私密，手动添加标签 `Private`（后续汇总时会自动排除）。

---

## 2. 月汇总页面

新建一个 Tiddler，标题命名为当月月份（例如 `2025-12`），添加标签 `MonthlyJournal`。

### 基础写法

在 Tiddler 正文中填入以下内容：

```html
<$list filter="[tag[Journal]prefix[2025-12-]!tag[Private]sort[title]reverse[]]">
    <h2><$link><$view field="title"/></$link></h2>
    <$transclude/>
    <hr/>
</$list>
```

**过滤器解析：**
- `tag[Journal]`：仅筛选带有 `Journal` 标签的日记。
- `prefix[2025-12-]`：匹配标题以 `2025-12-` 开头的条目（即当月所有日记）。
- `!tag[Private]`：排除带有 `Private` 标签的私密日记。
- `sort[title] reverse[]`：先按标题升序排序，再反转列表，使最新日期的日记排在最前面。

### 明确变量写法

如果你希望在列表内部更明确地引用当前条目，可以声明 `variable`：

```html
<$list filter="[tag[Journal]prefix[2025-12-]!tag[Private]sort[title]reverse[]]" variable="journal">
    <h2><$link to=<<journal>>><$text text=<<journal>> /></$link></h2>
    <$transclude tiddler=<<journal>> />
    <hr/>
</$list>
```

### 使用 $set 缓存 Filter 结果

当过滤逻辑较复杂时，也可以先用 `<$set>` 缓存过滤结果：

```html
<$set name="journals" filter="[tag[Journal]prefix[2025-12-]sort[title]reverse[]]">
    <$list filter=<<journals>> variable="journal">
        <h2><$link to=<<journal>>><$text text=<<journal>> /></$link></h2>
        <$transclude tiddler=<<journal>> />
        <hr/>
    </$list>
</$set>
```

---

## 3. 年汇总页面

有了月汇总之后，年汇总的实现就非常轻量了——只需汇总当年的所有“月汇总条目”。

新建一个 Tiddler，标题建议为 `2025 Diary`，内容如下：

```html
<$list filter="[tag[MonthlyJournal]prefix[2025-]sort[title]reverse[]]">
    <h1><$link><$view field="title"/></$link></h1>
    <$transclude/>
    <hr/>
</$list>
```

**过滤器解析：**
- `tag[MonthlyJournal] prefix[2025-]`：选出所有 2025 年的月汇总 Tiddler。
- `sort[title] reverse[]`：让最新月份（如 `2025-12`）排在前面。

因为月汇总已经嵌入了每日日记，年汇总通过 `<$transclude/>` 递归嵌入月汇总后，就能在一个页面中自上而下浏览全年的完整记录。

---

## 4. 使用模板复用代码

每个月都手动写一遍 Filter 和 HTML 结构比较繁琐，我们可以抽取一个通用的“月份日志模板”。

### 步骤一：新建模板 Tiddler

新建一个 Tiddler：
- **标题**：`MonthJournalTemplate`
- **标签**：`$:/tags/Template`

内容如下（这里使用了 TiddlyWiki 5.3.0+ 引入的条件语法 `<% if ... %>`）：

```html
<% if [<month>!is[blank]] %>
    <$list filter="[tag[Journal]prefix<month>!tag[Private]sort[title]reverse[]]" variable="journal">
        <h2><$link to=<<journal>>><$text text=<<journal>> /></$link></h2>
        <$transclude tiddler=<<journal>> mode="block" />
        <hr/>
    </$list>
<% else %>
    <div style="background: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <p>⚠️ <strong>这是月份日志模板，请传入 month 变量使用</strong></p>
    </div>
<% endif %>
```

> **注**：也可以使用宏（Macro）来定义过滤器，例如：
> ```html
> \define journal-filter() [tag[Journal]prefix<month>!tag[Private]sort[title]reverse[]]
> ```

通过外部传参使用模板：

```html
<$set name="month" value="2025-12-">
    <$transclude tiddler="MonthJournalTemplate" />
</$set>
```

### 步骤二：进一步优化，自动获取当前 Tiddler 标题

上面的方式依然要在新建月汇总时手动指定 `2025-12-`。我们可以更进一步：**直接利用当前 Tiddler 的标题作为月份前缀**，完全免除手动配置。

将 `MonthJournalTemplate` 修改为：

```html
<!-- 使用 $let 代替 $set，写法更现代 -->
<$let monthPrefix={{{ [<currentTiddler>addsuffix[-]] }}}>
  <$set name="journals" filter="[tag[Journal]prefix<monthPrefix>!tag[Private]sort[title]reverse[]]">
    <% if [<journals>!is[blank]] %>
      <$list filter=<<journals>> variable="journal">
        <h2><$link to=<<journal>>><$text text=<<journal>> /></$link></h2>
        <$transclude tiddler=<<journal>> mode="block" />
        <hr/>
      </$list>
    <% else %>
      <div style="background: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <p>⚠️ <strong>这是月份日志模板，或当前月份暂无日记</strong></p>
      </div>
    <% endif %>
  </$set>
</$let>
```

#### 调用方式

只要新建的 Tiddler 标题符合 `YYYY-MM`（如 `2025-12`），正文中只需要写一行即可：

```html
{{ MonthJournalTemplate }}
```

或者使用 Widget 语法：

```html
<$transclude tiddler="MonthJournalTemplate" />
```

---

## 5. 效果展示

最终渲染效果如下图所示，所有每日日记按倒序整齐汇总，且支持点击标题直接跳转到对应条目：

![TiddlyWiki Journal 汇总效果展示](https://img.baiyapeng.cc/file/blog/1793863178611_image.png)
