/** 플러그어블 파일 소스(GitHub, 로컬 파일시스템 등)의 공유 계약. */

/** 소스 트리의 파일 항목 하나(디렉터리는 클라이언트에서 파생된다). */
export interface TreeFile {
  /** 소스 루트 기준 상대 경로. 예: "specs/petstore.yaml". */
  path: string
  size: number
}

export interface FileContent {
  /** 디코딩된 UTF-8 텍스트. */
  text: string
  size: number
}

/** 설정 페이지에 표시되는 key/value 행 하나. */
export interface SourceDetail {
  label: string
  value: string
}

/** 설정 페이지에 표시되는 활성 소스의 사람이 읽을 수 있는 요약. */
export interface SourceInfo {
  /** 백엔드 표시 이름. 예: "GitHub". */
  label: string
  /** 소스가 가리키는 위치. 예: "owner/name" 또는 "/data". */
  location: string
  /** 백엔드별 추가 행(브랜치, 루트, 토큰 힌트 등). */
  details: SourceDetail[]
}

/**
 * 뷰어가 읽어오는 파일 소스. 각 구현체는 파일을 가져오는 방법과
 * 요청된 경로가 설정된 루트 안에 머물도록 하는 방법을 스스로 책임진다.
 * 이 인터페이스 위의 모든 것(탐색 화면, 렌더러)은 이 메서드에만 의존하며
 * 구체적인 백엔드에 직접 의존하지 않는다.
 *
 * 데스크탑(브라우저) 환경이라 바이너리는 Node `Buffer` 대신 data URL 로 돌려준다.
 */
export interface Source {
  /** 설정 페이지용 정적 설명. I/O 를 수행하지 않는다. */
  describe(): SourceInfo
  /**
   * 이 소스를 유일하게 식별하는 캐시 네임스페이스. 루트/저장소/브랜치를 포함해,
   * 서로 다른 소스의 같은 상대 경로가 캐시에서 충돌하지 않게 한다. I/O 없음.
   */
  cacheKey(): string
  list(): Promise<TreeFile[]>
  readText(relPath: string): Promise<FileContent>
  /** 이미지를 <img src> 로 바로 띄울 수 있는 `data:<mime>;base64,…` URL. */
  readDataUrl(relPath: string): Promise<string>
}

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundError'
  }
}

export class FileTooLargeError extends Error {
  constructor(
    readonly size: number,
    readonly limit: number,
  ) {
    super(`File is ${size} bytes, which exceeds the ${limit} byte limit`)
    this.name = 'FileTooLargeError'
  }
}
