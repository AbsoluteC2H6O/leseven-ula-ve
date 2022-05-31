const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("../utils/jwtGenerator");
const getDateYYYYMMDD = require("../utils/getDateYYYYMMDD");
const validInfo = require("../middleware/validinfo");
const authorization = require("../middleware/authorization");

router.get("/auth/register-metadata", async (req,res) => {


  const roles = await pool.query("SELECT * FROM rol_usuario");
  const paises = await pool.query("SELECT nombre FROM pais");
  const ciudades = await pool.query("SELECT nombre FROM ciudad");
  const escuelas = await pool.query("SELECT nombre FROM escuela");

  const metada = {
    roles: roles.rows || [],
    paises: paises.rows ? paises.rows.map(elem => elem.nombre) : [],
    ciudades: ciudades.rows ? ciudades.rows.map(elem => elem.nombre) : [],
    escuelas: escuelas.rows ? escuelas.rows.map(elem => elem.nombre) : [],
  }


  res.json(metada);
  
});

// register route
router.post("/auth/register", validInfo, async (req, res) => {
  try {
    // destructure req.body
    const { 
      nombre,
      apellido,
      correo,
      contrasena,
      escuela,
      ciudad,
      pais,
      tipo_aprendiz,
      grado_instruccion_aprendiz,
      fecha_nacimiento,
      rol_usuario_id,
      genero
      // fecha_registro,
      // usuario_metadatos_id,

     } = req.body;

     const correoSanatized = correo.trim().toLocaleLowerCase();
     
    // check if user exist
    const login = await pool.query("SELECT * FROM usuario WHERE correo = $1", [
      correoSanatized,
    ]);

    if (login.rows.length !== 0) {
      return res.status(401).send("User already exist.");
    }

    // bcrypt user password
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(contrasena, salt);

    const usuarioMetadatos = await pool.query(
      `INSERT INTO usuario_metadatos(practicas_realizadas, consultas_correctas, consultas_incorrectas, puntos_acumulados, trofeos_imparables, trofeos_leal, trofeos_agil)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [0, 0, 0, 0, 0, 0, 0]
    );

    const fecha_registro = getDateYYYYMMDD(new Date());
    
    // enter new user inside database
    const newLogin = await pool.query(
      `INSERT INTO usuario(nombre, apellido, correo, contrasena, escuela, ciudad, pais, tipo_aprendiz, grado_instruccion_aprendiz, fecha_nacimiento, rol_usuario_id, fecha_registro, usuario_metadatos_id, genero)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        nombre,
        apellido,
        correoSanatized,
        bcryptPassword,
        escuela,
        ciudad,
        pais,
        tipo_aprendiz,
        grado_instruccion_aprendiz,
        fecha_nacimiento,
        rol_usuario_id,
        fecha_registro,
        usuarioMetadatos.rows[0].id,
        genero
      ]
    );

    // generate jwt token
    const token = jwtGenerator(newLogin.rows[0].id);
    res.json({ token });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// login route
router.post("/auth/login", validInfo, async (req, res) => {
  try {
    // destructure the req.body
    const { correo, contrasena } = req.body;

    const correoSanatized = correo.trim().toLocaleLowerCase();


    // check if user doesn't exist
    const login = await pool.query("SELECT * FROM usuario WHERE correo = $1", [
      correoSanatized,
    ]);

    if (login.rows.length === 0) {
      return res.status(401).json("Password or email is incorrect.");
    }

    // check if incoming password is the same as the database password
    const validPassword = await bcrypt.compare(
      contrasena,
      login.rows[0].contrasena
    );
    if (!validPassword) {
      return res.status(401).json("Password or email is incorrect.");
    }

    // give jwt token
    const token = jwtGenerator(login.rows[0].id);
    res.json({ token });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

router.post("/auth/verify", authorization, async (req, res) => {
  try {
    res.json(true);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
