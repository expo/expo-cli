const { getProjectOwner: actualGetProjectOwner } = jest.requireActual('../projects');

const getProjectOwner = jest.fn(actualGetProjectOwner);

export { getProjectOwner };
