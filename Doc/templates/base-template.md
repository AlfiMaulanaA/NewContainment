# {{project.name}} - {{document.title}}

**Version:** {{project.version}}  
**Generated:** {{generation.date}}  
**Author:** {{project.author}}

---

## 📋 Table of Contents

{{#each sections}}
- [{{title}}](#{{anchor}})
{{/each}}

---

{{#each sections}}
## {{title}}

{{content}}

{{#if subsections}}
{{#each subsections}}
### {{title}}

{{content}}

{{/each}}
{{/if}}

---
{{/each}}

## 📞 Support & Documentation

{{#if project.support}}
- **Support Email:** {{project.support.email}}
- **Documentation:** {{project.support.docs}}
- **Repository:** {{project.repository}}
{{/if}}

---

*This document was automatically generated on {{generation.timestamp}} using the IoT Containment Documentation Generator.*