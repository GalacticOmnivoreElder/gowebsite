function compact(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean);
}

function text(value) {
  return String(value || "").trim();
}

function labelValue(label, value) {
  if (!text(value)) return null;
  return {
    columns: [
      { text: label.toUpperCase(), width: 76, style: "detailLabel" },
      { text: value, width: "*", style: "detailValue" },
    ],
    columnGap: 8,
    margin: [0, 0, 0, 4],
  };
}

function section(title, content) {
  const body = compact(Array.isArray(content) ? content : [content]);
  if (!body.length) return null;

  return {
    stack: [
      {
        columns: [
          {
            canvas: [
              {
                type: "rect",
                x: 0,
                y: 2,
                w: 3,
                h: 13,
                color: "#ca2280",
              },
            ],
            width: 10,
          },
          { text: title.toUpperCase(), style: "sectionTitle" },
        ],
        margin: [0, 0, 0, 9],
      },
      ...body,
    ],
    margin: [0, 0, 0, 18],
  };
}

function tags(values) {
  const items = compact(values);
  if (!items.length) return null;
  return {
    text: items.join("  •  "),
    style: "tagLine",
  };
}

function experienceEntry(item) {
  const details = compact([
    item.role,
    item.status,
    compact(item.tools).join(", "),
  ]);
  return {
    stack: [
      {
        columns: [
          {
            text: text(item.title) || "Untitled project",
            style: "entryTitle",
            width: "*",
          },
          item.link
            ? {
                text: "VIEW PROJECT",
                link: item.link,
                color: "#ca2280",
                decoration: "underline",
                fontSize: 7,
                bold: true,
                alignment: "right",
                width: 70,
              }
            : { text: "", width: 0 },
        ],
        columnGap: 8,
      },
      details.length
        ? { text: details.join("  •  "), style: "entryMeta" }
        : null,
      item.description
        ? { text: item.description, style: "body", margin: [0, 4, 0, 0] }
        : null,
    ].filter(Boolean),
    margin: [0, 0, 0, 12],
  };
}

function educationEntry(item) {
  if (typeof item === "string") {
    return { text: item, style: "body", margin: [0, 0, 0, 7] };
  }
  const title =
    item?.qualification ||
    item?.degree ||
    item?.title ||
    item?.program ||
    "Education";
  const meta = compact([
    item?.institution || item?.school,
    item?.location,
    item?.date || item?.year,
  ]).join("  •  ");

  return {
    stack: [
      { text: title, style: "entryTitle" },
      meta ? { text: meta, style: "entryMeta" } : null,
      item?.description
        ? { text: item.description, style: "body", margin: [0, 4, 0, 0] }
        : null,
    ].filter(Boolean),
    margin: [0, 0, 0, 11],
  };
}

export function buildCvPdfDefinition(model = {}) {
  const contactRows = compact([
    labelValue("Location", model.contact?.location),
    labelValue("Timezone", model.contact?.timezone),
    labelValue("Email", model.contact?.email),
    labelValue("Discord", model.contact?.discord),
  ]);
  const links = [
    ...compact(model.portfolioLinks).map((link) => ({
      label: "Portfolio",
      value: link.value,
      href: link.href,
    })),
    ...compact(model.socialLinks).map((link) => ({
      label: link.label,
      value: link.value,
      href: link.href,
    })),
  ].filter((link) => link.href);

  const content = [
    {
      table: {
        widths: ["*", 132],
        body: [
          [
            {
              stack: [
                { text: text(model.name) || "GO Member", style: "name" },
                {
                  text:
                    text(model.headline) || "Game development professional",
                  style: "headline",
                },
              ],
              border: [false, false, false, false],
              margin: [0, 0, 20, 0],
            },
            {
              stack: [
                { text: "GALACTIC OMNIVORE", style: "brand" },
                { text: "PROFESSIONAL MISSION PROFILE", style: "documentType" },
              ],
              alignment: "right",
              border: [false, false, false, false],
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 16],
    },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1.5,
          lineColor: "#ca2280",
        },
      ],
      margin: [0, 0, 0, 22],
    },
    section(
      "Professional Summary",
      model.summary ? { text: model.summary, style: "summary" } : null
    ),
    section(
      "Skills & Expertise",
      tags(model.skills)
    ),
    section(
      "Tools & Technologies",
      tags(model.tools)
    ),
    section(
      "Experience & Selected Projects",
      compact(model.experience).map(experienceEntry)
    ),
    section(
      "Education",
      compact(model.education).map(educationEntry)
    ),
    section(
      "Availability",
      tags(model.availability)
    ),
    section(
      "Collaboration Interests",
      compact([
        compact(model.interests?.lookingFor).length
          ? labelValue("Looking for", model.interests.lookingFor.join(", "))
          : null,
        compact(model.interests?.canHelpWith).length
          ? labelValue(
              "Can help with",
              model.interests.canHelpWith.join(", ")
            )
          : null,
      ])
    ),
    section("Contact", contactRows),
    section(
      "Portfolio & Links",
      links.map((link) => ({
        text: [
          { text: `${link.label}: `, bold: true, color: "#18151a" },
          {
            text: link.value,
            link: link.href,
            color: "#ca2280",
            decoration: "underline",
          },
        ],
        fontSize: 8.5,
        margin: [0, 0, 0, 5],
      }))
    ),
  ].filter(Boolean);
  if (content.length) {
    const lastIndex = content.length - 1;
    content[lastIndex] = { ...content[lastIndex], margin: [0, 0, 0, 0] };
  }

  return {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 36],
    info: {
      title: `${text(model.name) || "GO Member"} - GameDev Passport`,
      author: text(model.name) || "GO Member",
      subject: "Game development resume/CV",
      creator: "Galactic Omnivore",
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: "#312d33",
      lineHeight: 1.28,
    },
    background(currentPage) {
      return {
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: 595.28,
            h: 12,
            color: currentPage === 1 ? "#18151a" : "#ca2280",
          },
        ],
      };
    },
    footer(currentPage, pageCount) {
      return {
        columns: [
          {
            text: "GALACTIC OMNIVORE • GAME DEVELOPMENT MISSION HUB",
            color: "#777178",
            fontSize: 6.5,
          },
          {
            text: `${currentPage} / ${pageCount}`,
            color: "#777178",
            fontSize: 7,
            alignment: "right",
          },
        ],
        margin: [40, 12, 40, 0],
      };
    },
    content,
    styles: {
      body: {
        fontSize: 8.8,
        color: "#3d383f",
        lineHeight: 1.35,
      },
      brand: {
        fontSize: 9,
        bold: true,
        color: "#ca2280",
        characterSpacing: 0.8,
      },
      detailLabel: {
        fontSize: 6.5,
        bold: true,
        color: "#777178",
        characterSpacing: 0.5,
      },
      detailValue: {
        fontSize: 8.5,
        color: "#312d33",
      },
      documentType: {
        fontSize: 6.5,
        color: "#777178",
        margin: [0, 3, 0, 0],
      },
      entryMeta: {
        fontSize: 7.5,
        color: "#777178",
        margin: [0, 2, 0, 0],
      },
      entryTitle: {
        fontSize: 10,
        bold: true,
        color: "#18151a",
      },
      headline: {
        fontSize: 11,
        color: "#5f5861",
        margin: [0, 4, 0, 0],
      },
      name: {
        fontSize: 25,
        bold: true,
        color: "#18151a",
        lineHeight: 1,
      },
      sectionTitle: {
        fontSize: 9,
        bold: true,
        color: "#18151a",
        characterSpacing: 0.75,
      },
      summary: {
        fontSize: 10,
        color: "#3d383f",
        lineHeight: 1.4,
      },
      tagLine: {
        fontSize: 8.5,
        color: "#3d383f",
        lineHeight: 1.5,
      },
    },
  };
}

function moduleDefault(module) {
  return module?.default || module;
}

export async function downloadCvPdf(model) {
  const [pdfMakeModule, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = moduleDefault(pdfMakeModule);
  const fonts = moduleDefault(fontsModule);
  const fontVfs =
    fonts?.pdfMake?.vfs ||
    fonts?.vfs ||
    fontsModule?.pdfMake?.vfs ||
    fontsModule?.vfs ||
    (fonts &&
    Object.keys(fonts).some((filename) => filename.toLowerCase().endsWith(".ttf"))
      ? fonts
      : null);

  if (!pdfMake?.createPdf || !fontVfs) {
    throw new Error("The PDF engine could not be initialized.");
  }

  pdfMake.vfs = fontVfs;
  const definition = buildCvPdfDefinition(model);
  const blob = await new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(definition).getBlob(resolve);
    } catch (error) {
      reject(error);
    }
  });

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = model.filename || "go-member-gamedev-passport.pdf";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);

  return {
    filename: anchor.download,
    size: blob.size,
  };
}
