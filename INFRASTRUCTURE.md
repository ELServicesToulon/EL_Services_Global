# Infrastructure & Monitoring Diagram

```mermaid
graph TD
    subgraph "Local Server (Ubuntu)"
        A[Antigravity Sentinel<br/>(Network_Overseer.js)]
        style A fill:#f9f,stroke:#333,stroke-width:2px
    end

    subgraph "Google Cloud Platform"
        GAS1[Portail Client<br/>(Google Apps Script)]
        GAS2[App Livreur<br/>(Google Apps Script)]
    end

    subgraph "External Hosting"
        WEB1[Medcargo<br/>(O2switch)]
        WEB2[Mediconvoi Core<br/>(OVH VPS)]
        WEB3[Mediconvoi Sentinelle<br/>(IONOS VPS)]
    end

    A -->|HTTP GET / Health Check| GAS1
    A -->|HTTP GET / Health Check| GAS2
    A -->|HTTP GET / Health Check| WEB1
    A -->|HTTP GET / Health Check| WEB2
    A -->|HTTP GET / Health Check| WEB3

    style GAS1 fill:#ccf,stroke:#333
    style GAS2 fill:#ccf,stroke:#333
    style WEB1 fill:#cfc,stroke:#333
    style WEB2 fill:#cfc,stroke:#333
    style WEB3 fill:#cfc,stroke:#333
```

## Legend
- **Antigravity Sentinel**: The local monitoring agent running on your Ubuntu server.
- **Google Cloud Platform**: Your Google Apps Script projects serving as backends.
- **External Hosting**: Your VPS and hosting services for web applications and other tools.
