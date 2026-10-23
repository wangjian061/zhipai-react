// QR decoding is not CHSI decryption or identity verification. This replaceable
// adapter accepts explicitly labelled demo payloads only; never follow QR URLs.
export const COLLECTION_CODE_MAX_BYTES = 15 * 1024 * 1024;
export const COLLECTION_CODE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function collectionCodeError(code, title, message, projectId = "") {
  return Object.assign(new Error(message), { code, title, projectId });
}
export function validateCollectionCodeFile(file) {
  if (!COLLECTION_CODE_TYPES.includes(file.type))
    throw collectionCodeError(
      "format",
      "图片格式不支持",
      "请选择 JPG、PNG 或 WebP 格式的采集码图片。",
    );
  if (file.size > COLLECTION_CODE_MAX_BYTES)
    throw collectionCodeError(
      "size",
      "图片超过大小限制",
      "请选择15 MB以内的采集码图片。",
    );
}
export const collectionCodeAdapter = {
  async parse(raw) {
    let url;
    try {
      url = new URL(raw);
    } catch (_) {
      /* Unsupported, not a trusted code. */
    }
    if (
      !url ||
      url.protocol !== "zhipai-demo:" ||
      !["institution", "chsi"].includes(url.hostname)
    )
      throw collectionCodeError(
        "unsupported",
        "暂无法解析此二维码",
        "请核对是否为机构／院校二维码或本人学信网图像采集码，选择清晰完整的图片后重试。",
      );
    if (url.hostname === "institution")
      return {
        kind: "institution",
        projectId: url.searchParams.get("project"),
        prototype: true,
      };
    return {
      kind: "chsi",
      schoolCode: url.searchParams.get("school"),
      prototype: true,
      identity: {
        name: (url.searchParams.get("name") || "").slice(0, 30),
        number: (url.searchParams.get("number") || "").slice(0, 32),
        lastFour: (url.searchParams.get("lastFour") || "").slice(-4),
      },
    };
  },
};
export async function resolveCollectionCode(
  raw,
  context = {},
  directory = {},
  adapter = collectionCodeAdapter,
) {
  let timer;
  let result;
  try {
    result = await Promise.race([
      adapter.parse(raw),
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              collectionCodeError(
                "timeout",
                "关联项目超时",
                "暂时无法完成采集码解析，请稍后重试。",
              ),
            ),
          12000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  const { projects = [], entries = {}, bindings = [] } = directory;
  if (!result || !["institution", "chsi"].includes(result.kind))
    throw collectionCodeError(
      "unsupported",
      "不支持此二维码",
      "请核对二维码类型后重新识别。",
    );
  if (context.intent === "collectionIdentity" && result.kind !== "chsi")
    throw collectionCodeError(
      "personal_required",
      "请使用本人图像采集码",
      "机构二维码用于进入项目，不能代替本人的学信网图像采集码。",
    );
  let ids =
    result.kind === "institution"
      ? [result.projectId]
      : bindings
          .filter(
            (binding) =>
              binding.schoolCode === result.schoolCode &&
              (!result.organizationId ||
                binding.organizationId === result.organizationId),
          )
          .flatMap((binding) => binding.projectIds);
  ids = [...new Set(ids.filter(Boolean))];
  if (context.projectId) {
    if (!ids.includes(context.projectId))
      throw collectionCodeError(
        "mismatch",
        "采集码与当前项目不符",
        "请使用本项目对应学籍的图像采集码，当前项目和已填信息已保留。",
      );
    ids = [context.projectId];
  }
  if (ids.length !== 1)
    throw collectionCodeError(
      ids.length ? "ambiguous" : "unmapped",
      "暂无法关联采集项目",
      ids.length
        ? "该机构关联了多个采集项目，暂时无法确定本次项目，请向采集负责人核实。"
        : "未找到此采集码对应的机构或项目，请核对采集通知或向负责人核实。",
    );
  const project = projects.find((item) => item.id === ids[0]);
  if (!project)
    throw collectionCodeError(
      "missing",
      "采集项目不存在",
      "此二维码关联的项目暂不可用，请向采集负责人核实。",
    );
  if (project.status !== "ongoing" || entries[project.type] !== true)
    throw collectionCodeError(
      "closed",
      "当前无法开始采集",
      project.status === "ended"
        ? "本项目采集已结束，可查看项目与已有记录。"
        : project.status === "not_started"
          ? "本项目尚未开始，可先查看采集要求。"
          : "此采集入口暂未开放，可查看项目信息。",
      project.id,
    );
  if (result.kind === "chsi" && !project.methods.includes("qr"))
    throw collectionCodeError(
      "method",
      "项目不支持采集码认证",
      "请使用项目通知中指定的身份认证方式。",
      project.id,
    );
  return {
    kind: result.kind,
    projectId: project.id,
    identity: result.identity || {},
    prototype: result.prototype === true,
  };
}
// Memory-only, single-use handoff. No raw QR, name or student number in URLs/storage.
export const collectionScanService = {
  directory: () => ({}),
  pending: null,
  async resolve(raw, context = {}) {
    return resolveCollectionCode(raw, context, this.directory());
  },
  queue(result, owner = null) {
    this.pending = { ...result, owner, expires: Date.now() + 5 * 60 * 1000 };
  },
  clear() {
    this.pending = null;
  },
};
