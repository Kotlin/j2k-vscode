import org.springframework.util.StringUtils
import org.springframework.validation.Errors
import org.springframework.validation.Validator

class PetValidator : Validator {

    override fun supports(clazz: Class<*>): Boolean = 
        when (clazz) {
            is Class<*> -> clazz.isAssignableFrom(Pet::class.java)
            else -> false
        }

    override fun validate(obj: Any?, errors: Errors) {
        obj as Pet ?: return // Safely cast to Pet, returning early if not possible
        
        // Name validation - reject empty or whitespace-only strings (including null)
        val name = obj.name
        if (!name.hasText()) {
            errors.rejectValue("name", REQUIRED, "{ognl.expression}")
        }
        
        // Type validation for new pets
        if (obj.isNew() && obj.type == null) {
            errors.rejectValue("type", REQUIRED, "{ognl.expression}")
        }
        
        // Birth date validation
        if (obj.birthDate == null) {
            errors.rejectValue("birthDate", REQUIRED, "{ognl.expression}")
        }
    }

}