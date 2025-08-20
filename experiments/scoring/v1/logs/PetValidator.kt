import org.springframework.util.StringUtils
import org.springframework.validation.Errors
import org.springframework.validation.Validator

class PetValidator : Validator {

    companion object {
        const val REQUIRED = "required"
    }

    override fun validate(obj: Any, errors: Errors) {
        obj as Pet ?: return
        val name = obj.name
        // name validation
        if (!StringUtils.hasText(name)) {
            errors.rejectValue("name", REQUIRED, arrayOf(REQUIRED))
        }

        // type validation
        if (obj.isNew && obj.type == null) {
            errors.rejectValue("type", REQUIRED, arrayOf(REQUIRED))
        }

        // birth date validation
        if (obj.birthDate == null) {
            errors.rejectValue("birthDate", REQUIRED, arrayOf(REQUIRED))
        }
    }

    override fun supports(clazz: Class<*>): Boolean {
        return Pet::class.java.isAssignableFrom(clazz)
    }
}